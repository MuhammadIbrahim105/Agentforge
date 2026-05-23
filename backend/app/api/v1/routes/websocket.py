from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from loguru import logger

router = APIRouter()


@router.websocket("/ws/{run_id}")
async def websocket_endpoint(websocket: WebSocket, run_id: str):
    await websocket.accept()
    logger.info(f"WebSocket connected for run: {run_id}")
    try:
        await websocket.send_json({
            "type": "connected",
            "run_id": run_id,
            "message": "WebSocket connection established"
        })
        while True:
            data = await websocket.receive_text()
            await websocket.send_json({
                "type": "echo",
                "data": data
            })
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for run: {run_id}")