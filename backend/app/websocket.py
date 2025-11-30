from fastapi import FastAPI, WebSocket
from fastapi.responses import HTMLResponse

app = FastAPI()

html = """
<!DOCTYPE html>
<html>
    <head>
        <title>WebSocket Test</title>
    </head>
    <body>
        <h1>WebSocket Test</h1>
        <button onclick="sendMessage()">Send Message</button>
        <script>
            const ws = new WebSocket("ws://localhost:8000/ws");

            ws.onmessage = (event) => {
                console.log("Message from server: ", event.data);
            };

            function sendMessage() {
                ws.send("Hello Server!");
            }
        </script>
    </body>
</html>
"""

@app.get("/")
async def get():
    return HTMLResponse(html)

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    while True:
        data = await websocket.receive_text()
        await websocket.send_text(f"Message text was: {data}")