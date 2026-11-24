import asyncio
import json
from typing import Literal

from fastapi import FastAPI, HTTPException
from ollama import AsyncClient
from pydantic import BaseModel, ValidationError, model_validator


# ==========================================
# 1. INITIALIZE AGENTX
# ==========================================

app = FastAPI(
    title="AgentX",
    description="Autonomous AI Operations Platform",
    version="1.1.0"
)

ollama_client = AsyncClient()

MODEL_NAME = "llama3:latest"
MAX_AGENT_RETRIES = 2
RETRY_DELAY_SECONDS = 2


# ==========================================
# 2. PYDANTIC DATA MODELS
# ==========================================

class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    response: str


class PlanStep(BaseModel):
    step: int
    task: str
    assigned_agent: Literal[
        "Research Agent",
        "Data Analyst Agent",
        "Writer Agent",
        "Reviewer Agent"
    ]
    expected_output: str


class PlanResponse(BaseModel):
    objective: str
    steps: list[PlanStep]
    final_deliverable: str

    @model_validator(mode="after")
    def validate_workflow(self):
        agent_order = {
            "Research Agent": 1,
            "Data Analyst Agent": 2,
            "Writer Agent": 3,
            "Reviewer Agent": 4
        }

        if not self.steps:
            raise ValueError(
                "An execution plan must contain at least one step."
            )

        previous_order = 0

        for index, step in enumerate(self.steps, start=1):
            if step.step != index:
                raise ValueError(
                    "Steps must be numbered sequentially."
                )

            current_order = agent_order[step.assigned_agent]

            if current_order < previous_order:
                raise ValueError(
                    "Invalid workflow: agents must follow "
                    "Research -> Analysis -> Writing -> Review."
                )

            previous_order = current_order

        return self


# ==========================================
# 2.1 EXECUTION DATA MODELS
# ==========================================

class ExecutionStep(BaseModel):
    step: int
    task: str
    assigned_agent: str
    expected_output: str
    status: Literal[
        "pending",
        "running",
        "completed",
        "failed"
    ] = "pending"
    result: str = ""


class ExecutionResponse(BaseModel):
    objective: str
    status: Literal["completed", "failed"]
    steps: list[ExecutionStep]
    final_deliverable: str


# ==========================================
# 3. AGENT ROLE DEFINITIONS
# ==========================================

AGENT_INSTRUCTIONS = {
    "Research Agent": """
    You are AgentX Research Agent.

    Your responsibilities:
    - Investigate the assigned task.
    - Organize relevant information.
    - Identify important facts and limitations.
    - Never invent sources, statistics or findings.
    - Clearly distinguish known information from uncertainty.

    Important:
    You do not have internet access unless an external
    search tool is explicitly provided.
    Do not pretend to have searched the internet.
    """,

    "Data Analyst Agent": """
    You are AgentX Data Analyst Agent.

    Your responsibilities:
    - Analyse the information provided.
    - Identify patterns and important observations.
    - Perform calculations when necessary.
    - Explain your reasoning clearly.
    - Never invent missing data.
    """,

    "Writer Agent": """
    You are AgentX Writer Agent.

    Your responsibilities:
    - Create a clear and useful deliverable.
    - Use the research and analysis provided.
    - Organize information professionally.
    - Avoid unsupported claims.
    - Make the final content easy to understand.
    """,

    "Reviewer Agent": """
    You are AgentX Reviewer Agent.

    Your responsibilities:
    - Review the previous agent's work.
    - Identify factual inconsistencies.
    - Check completeness and clarity.
    - Correct weaknesses where possible.
    - Produce an improved final deliverable.

    Do not claim external verification unless it happened.
    """
}


# ==========================================
# 3.1 AGENT EXECUTION CONTROLLER
# ==========================================

async def execute_agent(agent_name: str, task_prompt: str):
    """
    Execute one specialist agent.
    Retry up to MAX_AGENT_RETRIES times after the first attempt.
    """

    if agent_name not in AGENT_INSTRUCTIONS:
        raise ValueError(f"Unknown agent: {agent_name}")

    last_error = None

    for attempt in range(MAX_AGENT_RETRIES + 1):
        try:
            response = await ollama_client.chat(
                model=MODEL_NAME,
                messages=[
                    {
                        "role": "system",
                        "content": AGENT_INSTRUCTIONS[agent_name]
                    },
                    {
                        "role": "user",
                        "content": task_prompt
                    }
                ]
            )

            result = response.message.content

            if not result or not result.strip():
                raise ValueError("Agent returned an empty response.")

            return result.strip()

        except Exception as error:
            last_error = error

            if attempt < MAX_AGENT_RETRIES:
                await asyncio.sleep(RETRY_DELAY_SECONDS)

    raise RuntimeError(
        f"{agent_name} failed after "
        f"{MAX_AGENT_RETRIES + 1} attempts: {last_error}"
    )


# ==========================================
# 4. HELPER: GENERATE WORKFLOW PLAN
# ==========================================

async def generate_workflow_plan(message: str):
    response = await ollama_client.chat(
        model=MODEL_NAME,
        format="json",
        messages=[
            {
                "role": "system",
                "content": """
                You are AgentX's Workflow Planning Agent.

                Create logical, sequential execution plans.

                AVAILABLE AGENTS:

                1. Research Agent:
                   Collects and organizes information.

                2. Data Analyst Agent:
                   Analyses collected information.

                3. Writer Agent:
                   Creates the requested deliverable.

                4. Reviewer Agent:
                   Checks accuracy and quality.

                WORKFLOW RULES:

                - Research must happen before analysis.
                - Analysis must happen before writing.
                - Writing must happen before review.
                - Assign one agent to each step.
                - Include all necessary steps.
                - Use sequential numbering starting at 1.
                - Never claim tasks have been completed.
                - Never invent research findings.

                Return only valid JSON in this format:

                {
                    "objective": "User objective",
                    "steps": [
                        {
                            "step": 1,
                            "task": "Task description",
                            "assigned_agent": "Research Agent",
                            "expected_output": "Expected result"
                        }
                    ],
                    "final_deliverable": "Expected final output"
                }

                Use only the four available agent names.
                """
            },
            {
                "role": "user",
                "content": message
            }
        ]
    )

    plan_data = json.loads(response.message.content)
    return PlanResponse.model_validate(plan_data)


# ==========================================
# 5. HOME ENDPOINT
# ==========================================

@app.get("/")
async def home():
    return {
        "application": "AgentX",
        "description": "Autonomous AI Operations Platform",
        "version": "1.1.0",
        "status": "online",
        "model": MODEL_NAME
    }


# ==========================================
# 6. HEALTH CHECK ENDPOINT
# ==========================================

@app.get("/health")
async def health():
    try:
        await ollama_client.list()

        return {
            "status": "healthy",
            "ollama": "connected",
            "model": MODEL_NAME
        }

    except Exception as error:
        raise HTTPException(
            status_code=503,
            detail=f"Ollama connection failed: {str(error)}"
        )


# ==========================================
# 7. CHAT ENDPOINT
# ==========================================

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    try:
        response = await ollama_client.chat(
            model=MODEL_NAME,
            messages=[
                {
                    "role": "system",
                    "content": """
                    You are AgentX, an intelligent AI assistant.

                    Be helpful, accurate and concise.

                    Clearly distinguish between implemented
                    capabilities and capabilities that are
                    not yet available.
                    """
                },
                {
                    "role": "user",
                    "content": request.message
                }
            ]
        )

        return ChatResponse(
            response=response.message.content
        )

    except Exception as error:
        raise HTTPException(
            status_code=502,
            detail=f"Chat generation failed: {str(error)}"
        )


# ==========================================
# 8. PLANNER AGENT
# ==========================================

@app.post("/plan", response_model=PlanResponse)
async def create_plan(request: ChatRequest):
    try:
        if not request.message.strip():
            raise HTTPException(
                status_code=400,
                detail="Task description cannot be empty."
            )

        return await generate_workflow_plan(request.message)

    except HTTPException:
        raise

    except (json.JSONDecodeError, ValidationError) as error:
        raise HTTPException(
            status_code=502,
            detail=f"Planner returned an invalid plan: {str(error)}"
        )

    except Exception as error:
        raise HTTPException(
            status_code=502,
            detail=f"Planner generation failed: {str(error)}"
        )


# ==========================================
# 9. AGENT EXECUTION ENGINE
# ==========================================

@app.post("/execute", response_model=ExecutionResponse)
async def execute_task(request: ChatRequest):

    if not request.message.strip():
        raise HTTPException(
            status_code=400,
            detail="Task description cannot be empty."
        )

    execution_steps = []
    previous_outputs = []

    try:
        # ----------------------------------
        # PHASE 1: GENERATE EXECUTION PLAN
        # ----------------------------------

        plan = await generate_workflow_plan(request.message)

        # ----------------------------------
        # PHASE 2: PREPARE EXECUTION STEPS
        # ----------------------------------

        for step in plan.steps:
            execution_steps.append(
                ExecutionStep(
                    step=step.step,
                    task=step.task,
                    assigned_agent=step.assigned_agent,
                    expected_output=step.expected_output
                )
            )

        # ----------------------------------
        # PHASE 3: EXECUTE SPECIALIST AGENTS
        # ----------------------------------

        for index, step in enumerate(plan.steps):
            current_step = execution_steps[index]
            current_step.status = "running"

            previous_context = "\n\n".join(previous_outputs)

            agent_prompt = f"""
            OBJECTIVE:
            {plan.objective}

            YOUR ASSIGNED TASK:
            {step.task}

            EXPECTED OUTPUT:
            {step.expected_output}

            PREVIOUS AGENT OUTPUTS:
            {previous_context if previous_context else "No previous outputs."}

            INSTRUCTIONS:

            Complete only your assigned task.

            Use previous agent outputs when available.

            Do not invent information or claim external
            actions that you have not performed.

            Return a clear and useful result.
            """

            try:
                # Execute specialist agent with automatic retries
                agent_result = await execute_agent(
                    agent_name=step.assigned_agent,
                    task_prompt=agent_prompt
                )

                current_step.result = agent_result
                current_step.status = "completed"

                # Pass output to the next agent
                previous_outputs.append(
                    f"""
                    AGENT: {step.assigned_agent}
                    TASK: {step.task}
                    RESULT:
                    {agent_result}
                    """
                )

            except Exception as error:
                current_step.status = "failed"
                current_step.result = str(error)

                return ExecutionResponse(
                    objective=plan.objective,
                    status="failed",
                    steps=execution_steps,
                    final_deliverable=(
                        f"Execution stopped at step {step.step}. "
                        f"Agent error: {str(error)}"
                    )
                )

        # ----------------------------------
        # PHASE 4: COLLECT FINAL DELIVERABLE
        # ----------------------------------

        completed_outputs = [
            step.result
            for step in execution_steps
            if step.status == "completed"
        ]

        final_deliverable = (
            completed_outputs[-1]
            if completed_outputs
            else "No deliverable was generated."
        )

        # ----------------------------------
        # PHASE 5: RETURN EXECUTION RESULT
        # ----------------------------------

        return ExecutionResponse(
            objective=plan.objective,
            status="completed",
            steps=execution_steps,
            final_deliverable=final_deliverable
        )

    except (json.JSONDecodeError, ValidationError) as error:
        raise HTTPException(
            status_code=502,
            detail=f"Execution planning failed: {str(error)}"
        )

    except Exception as error:
        raise HTTPException(
            status_code=502,
            detail=f"AgentX execution failed: {str(error)}"
        )