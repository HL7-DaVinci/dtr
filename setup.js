
var fs = require("fs"),
  request = require("request"),
  http = require("http"),
  jsonServer = require("json-server"),
  server = jsonServer.create(),
  router = jsonServer.router("./src/db.json"),
  middlewares = jsonServer.defaults();

  // assume Prod (Production) by default
  version = process.env.VERSION;
  serverPort = 3005;
  serverHttps = false;
  serverHost = "0.0.0.0";
  serverPublic = "davinci-dtr.logicahealth.org";
  proxyTarget = "https://davinci-crd.logicahealth.org";

  if (version == "Dev") {
    serverPort = 3005;
    serverHttps = false;
    serverHost = "0.0.0.0";
    serverPublic = "0.0.0.0";
    proxyTarget = "http://localhost:8090";
  } else if (version == "Template") {
    serverPort = process.env.SERVER_PORT;
    serverHttps = process.env.SERVER_HTTPS;
    serverHost = process.env.SERVER_HOST;
    serverPublic = process.env.SERVER_PUBLIC;
    proxyTarget = process.env.PROXY_TARGET;
  }

  console.log("---- Configuration ----");
  console.log("    VERSION      : " + version);
  console.log("    SERVER_PORT  : " + serverPort);
  //console.log("    SERVER_HTTPS : " + serverHttps);
  //console.log("    SERVER_HOST  : " + serverHost);
  //console.log("    SERVER_PUBLIC: " + serverPublic);
  console.log("    PROXY_TARGET : " + proxyTarget);

  server.use("/fhir", function(req, res) {
    var url = proxyTarget + "/fhir" + req.url;
    console.log(url);

    req.pipe(request({url:url,  agentOptions: {
        rejectUnauthorized: false
      }})).pipe(res);
  });
  server.use("/files", function(req, res) {
    var url = proxyTarget + "/files" + req.url;
    console.log(url);

    req.pipe(request({url:url,  agentOptions: {
        rejectUnauthorized: false
      }})).pipe(res);
  });

// pem.createCertificate({ days: 1, selfSigned: true }, function (err, keys) {
//     if (err) {
//       throw err;
//     }

//     var options = {
//         key: keys.serviceKey,
//         cert: keys.certificate
//       };
      
//     server.use(middlewares);
//     server.use(jsonServer.bodyParser);
// server.use((req, res, next) => {
//   if (req.method === "POST") {
//     req.body.createdAt = Date.now();
//   }
//   // Continue to JSON Server router
//   next();
// });

//     server.get("/register", function(req, res){
//         res.sendFile(__dirname + "/public/register.html");
//     });
//     server.get("/index", function(req, res){
//         res.sendFile(__dirname + "/public/index.html");
//     });
//     server.get("/launch", function(req, res){
//         res.sendFile(__dirname + "/public/launch.html");
//     });
//     server.get("/priorauth", function(req, res){
//         res.sendFile(__dirname + "/public/priorauth.html");
//     });

//     server.use(router);
//     https.createServer(options, server).listen(serverPort, "0.0.0.0", function() {
//         console.log("json-server started on port " + serverPort);
//     });
      
//   });

  var options = {
  };
  
server.use(middlewares);
server.use(jsonServer.bodyParser);
server.use((req, res, next) => {
if (req.method === "POST") {
    req.body.createdAt = Date.now();
}
// Continue to JSON Server router
next();
});

server.get("/register", function(req, res){
    console.log("register");
    console.log(__dirname + "/public/register.html");
    res.sendFile(__dirname + "/public/register.html");
});
server.get("/index", function(req, res){
    console.log("henlo");
    res.sendFile(__dirname + "/public/index.html");
});
server.get("/launch", function(req, res){
    res.sendFile(__dirname + "/public/launch.html");
});
server.get("/priorauth", function(req, res){
    res.sendFile(__dirname + "/public/priorauth.html");
});

server.use(router);
http.createServer(options, server).listen(serverPort, function() {
    console.log("json-server started on port " + serverPort);
});
  