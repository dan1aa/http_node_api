const http = require("http");
const fs = require("fs");
const url = require("url");
const { parse } = require("querystring");
const cluster = require('cluster');
const cpus = require('os').cpus()

const numCpus = cpus.length;

if(cluster.isMaster) {
    console.log(numCpus)
    console.log(process.pid)

    for(let i = 0; i < numCpus; i++) {
      cluster.fork()
    }

    cluster.on('exit', () => {
      cluster.fork();
    })
} else {
  const server = http.createServer((req, res) => {
    let usersFile, newUser;
    if (req.headers["authorization"] !== "Bearer 12345") {
      res.statusCode = 401;
      res.end("Auth token is not found!");
    } else if (req.method === "GET" && req.url === "/") {
      res.write("HOME");
      res.end();
    } 
    else if (req.method === "GET" && req.url === "/api/users") {
      res.writeHead(200, { "Content-Type": "application/json" });
      fs.readFile("users.json", "utf-8", (err, data) => {
        if (err) throw new Error(err);
        res.end(data);
      });
    } 
    else if (
      req.method === "GET" &&
      req.url.match(pathRegex(/\/api\/users\/([0-9]+)/))
    ) {
      res.writeHead(200, { "Content-Type": "application/json" });
      const pathName = url.parse(`${req.url}`).pathname;
      const [api, users, _, id] = pathName.split('/')
      fs.readFile("users.json", "utf-8", (err, data) => {
        if (err) throw new Error(err);
        usersFile = JSON.parse(data);
        let userById = usersFile.users.find((i) => i.id === id);
        userById === undefined ? (res.statusCode = 404, res.end('Not found')) : res.end(JSON.stringify(userById))
      });
    } 
    else if (
      req.method === "DELETE" &&
      req.url.match(pathRegex(/\/api\/users\/([0-9]+)/))
    ) {
      const pathName = url.parse(`${req.url}`).pathname;
      const parsed = pathName.split("/").slice(-1).toString();
      res.writeHead(200, { "Content-Type": "application/json" });
      fs.readFile("users.json", "utf-8", (err, data) => {
        if (err) throw new Error(err);
        usersFile = JSON.parse(data);
        let userById = usersFile.users.find(i => i.id === parsed)
        if (userById) {
          let idx = usersFile.users.indexOf(userById)
          usersFile.users.splice(idx, 1)
          fs.writeFile('users.json', JSON.stringify(usersFile), () => console.log('write'))
          res.end(JSON.stringify(usersFile))
        }
        else {
          res.statusCode = 404;
          res.end('User not found!')
        }
      });
    } 
    else if (req.method === "POST" && req.url === "/api/users") {
      res.writeHead(200, { "Content-Type": "application/x-www-form-urlencoded" });
      collectRequestData(req, (result) => {
        fs.readFile("users.json", "utf8", function readFileCallback(err, data) {
          if (err) throw new Error(err);
          else {
            newUser = {
              name: result?.name || "name not found",
              age: result?.age || "age not found",
              id: result?.id || "id not found",
            };
            usersFile = JSON.parse(data);
            usersFile.users.push(newUser);
            json = JSON.stringify(usersFile);
            fs.writeFile("users.json", json, "utf8", (err) => {
              if (err) throw new Error(err);
              res.end(json);
            });
          }
        });
      });
    } 
    else if (
      req.method === "PATCH" &&
      req.url.match(pathRegex(/\/api\/users\/([0-9]+)/))
    ) {
      res.writeHead(200, { "Content-Type": "application/x-www-form-urlencoded" });
      const pathName = url.parse(`${req.url}`).pathname;
      const parsed = pathName.split("/").slice(-1).toString();
      collectRequestData(req, (result) => {
        fs.readFile("users.json", "utf-8", (err, data) => {
          if (err) throw new Error(err);
          usersFile = JSON.parse(data);
          let userById = usersFile.users.find((i) => i.id === parsed);
          userById["name"] = result?.name || userById.name;
          userById["age"] = result?.age || userById.age;
          userById["id"] = result?.id || userById.id;
          fs.writeFile("users.json", JSON.stringify(usersFile), (err) => {
            if (err) throw new Error(err);
          });
          res.end(JSON.stringify(userById));
        });
      });
    } 
    else if ((req.url = "*")) {
      res.statusCode = 404;
      res.end("Not found");
    }
  });

  function collectRequestData(request, callback) {
    const FORM_URLENCODED = "application/x-www-form-urlencoded";
    if (request.headers["content-type"] === FORM_URLENCODED) {
      let body = "";
      request.on("data", (chunk) => {
        body += chunk.toString();
      });
      request.on("end", () => {
        callback(parse(body));
      });
    } else {
      callback(null);
    }
  }
  
  function pathRegex(regexUri) {
    return regexUri;
  }  
  
  server.listen(3000, () => console.log("server listening on 3000"));
  
}

