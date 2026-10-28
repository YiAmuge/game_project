import{createDevServer}from'./serve.mjs';
const port=Number(process.env.PORT||5173),server=createDevServer(undefined,{production:true});
server.on('error',error=>{console.error(error.code==='EADDRINUSE'?`포트 ${port}가 이미 사용 중입니다.`:error.message);server.close();process.exitCode=1;});
server.listen(port,'0.0.0.0',()=>console.log(`도시 경계 온라인 서버 · 포트 ${port} · 방 생성/참가 서비스 활성화`));
