/*
    The main server for the tooling. Orginally for the POC but evolved since then
    start with ./localrun.sh which supplies the environment variables see below
*/

//let fs = require('fs')
let http = require('http');
const axios = require("axios");

//https://authoring.nzhts.digital.health.nz/fhir/
//https://r4.ontoserver.csiro.au/fhir/
const termServerUrl = process.env.TERM_SERVER_URL || 'https://r4.ontoserver.csiro.au/fhir/'

//the port that the POC server listens on for HTML & API calls
let port = process.env.PORT || 9500

//the Mongo database used by the models (and associated) apps
//todo - not sure why we'd change this...
const mongoDbName = process.env.MONGODB || "clinfhir"



const bodyParser = require('body-parser')

console.log(`Server: Mongo database name is ${mongoDbName}`)
console.log("")


//const commonModule = require("./serverModuleCommonUI.js")
const terminologyModule = require("./serverModuleTerminologyForms")
const modelModule = require("./serverModuleModel")
const QModule = require("./serverModuleQ")
const libraryModule = require("./serverModuleLibrary")
const playgroundModule = require("./serverModulePlayground")



let express = require('express');
let app = express();
app.use(bodyParser.json({limit:'50mb',type:['application/json+fhir','application/fhir+json','application/json']}))
app.use('/', express.static(__dirname,{index:'/formsFrontPage.html'}));

//from chatGPT to allow call from elsewhere
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*'); // Allow all origins
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE'); // Allowed methods
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization'); // Allowed headers
    next();
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

let mongoHostName = process.env.MONGOHOSTNAME || "127.0.0.1"

const mongoUri = `mongodb://${mongoHostName}:27017`  //local machine
console.log(`Mongo connection uri is ${mongoUri}`)






console.log(`Default terminology server is ${termServerUrl}`)

terminologyModule.setup(app,termServerUrl)
modelModule.setup(app,mongoDbName,mongoUri)      //pass in the mongo database name to use
QModule.setup(app,mongoDbName,mongoUri)
libraryModule.setup(app)
playgroundModule.setup(app,mongoDbName,mongoUri)

//common calls (not specifically related to requester or lab. ?move to separate module
//ontoserver -

app.get('/config', (req, res) => {
    res.json({
        logoUrl: process.env.APP_LOGO_URL || 'images/canshareLogo.png',
        termServerUrl : termServerUrl

    });
});



app.get('/validatorHints',function (req,res) {
    let fle = require("./validatorHints.json")
    res.json(fle)
})


//validation.
app.post('/validateBundle', async function (req,res) {
    let bundle = req.body
    if (! bundle || ! bundle.entry) {
        res.status(400).json({msg:"Must contain a bundle. Is the content-type header set to 'application/json' "})
    } else {
        let validationEP = "http://localhost:9300/validateActNow"
        try {
            let response = await axios.post(validationEP,bundle)
            res.json(response.data)
        } catch (ex) {
            res.status(500).json(ex)
        }
    }
})


app.get('/config', async function(req,res){

    let config = {
        "PORT":process.env.PORT,
        "MONGODB":process.env.MONGODB
    }

    res.json(config)
})





server = http.createServer(app).listen(port);
console.log("Server listening on port " + port)
