
var fs = require("fs"),
  https = require("https"),
  jsonServer = require("json-server"),
  pem = require("pem"),
  server = jsonServer.create(),
  router = jsonServer.router("./src/db.json"),
  middlewares = jsonServer.defaults();


pem.createCertificate({ days: 1, selfSigned: true }, function (err, keys) {
    if (err) {
      throw err;
    }

    var options = {
        key: keys.serviceKey,
        cert: keys.certificate
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
    // server.get('/register', function(req, res){
    //     res.sendFile(__dirname + '/public/register.html');
    // });
    // server.get('/index', function(req, res){
    //     res.sendFile(__dirname + '/public/index.html');
    // });
    // server.get('/launch', function(req, res){
    //     res.sendFile(__dirname + '/public/launch.html');
    // });
    // server.get('/priorauth', function(req, res){
    //     res.sendFile(__dirname + '/public/priorauth.html');
    // });

    server.use(router);

    https.createServer(options, server).listen(3006, function() {
        console.log("json-server started on port " + 3006);
    });
      
  });