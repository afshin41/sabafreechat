import express from "express";
import { WebSocketServer } from "ws";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// سرو کردن HTML و JS
app.use(express.static(__dirname));

const rooms = {};

wss.on("connection", ws => {
  let userKey = "";

  ws.on("message", msg => {
    let data;
    try { data = JSON.parse(msg); } catch(e){ return; }

    const { type, key, text, status } = data;

    if(type === "join"){
      userKey = key;
      if(!rooms[userKey]) rooms[userKey] = [];
      if(!rooms[userKey].includes(ws)) rooms[userKey].push(ws);
      if(rooms[userKey].length > 2) rooms[userKey] = rooms[userKey].slice(-2);

      rooms[userKey].forEach(client => {
        if(client !== ws && client.readyState === client.OPEN){
          client.send(JSON.stringify({type:"system", text:"Friend connected"}));
        }
      });
    }

    else if(type === "msg"){
      if(!rooms[key]) return;
      rooms[key].forEach(client => {
        if(client !== ws && client.readyState === client.OPEN){
          client.send(JSON.stringify({type:"msg", text}));
        }
      });
    }

    else if(type === "typing"){
      if(!rooms[key]) return;
      rooms[key].forEach(client => {
        if(client !== ws && client.readyState === client.OPEN){
          client.send(JSON.stringify({type:"typing", status}));
        }
      });
    }
  });

  ws.on("close", () => {
    if(userKey && rooms[userKey]){
      rooms[userKey] = rooms[userKey].filter(c => c !== ws);
      if(rooms[userKey].length === 0) delete rooms[userKey];
      if(rooms[userKey]){
        rooms[userKey].forEach(client => {
          if(client.readyState === client.OPEN){
            client.send(JSON.stringify({type:"system", text:"Friend disconnected"}));
          }
        });
      }
    }
  });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
