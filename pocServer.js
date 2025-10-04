/*
    The main server for the tooling. Orginally for the POC but evolved since then
    start with ./localrun.sh which supplies the environment variables see below
*/

let fs = require('fs')
let http = require('http');
const axios = require("axios");

//console.log('port',process.env.SERVERBASE)

//the port that the POC server listens on for HTML & API calls
let port = process.env.PORT || 9500

//the Mongo database used by the models (and associated) apps
const mongoDbName = process.env.MONGODB || "clinfhir"

// Object to store clients by their IDs
const clients = new Map();






const bodyParser = require('body-parser')

//console.log(`Server: Localserver root from env is ${process.env.SERVERBASE}`)
console.log(`Server: Mongo database name is ${mongoDbName}`)
console.log("")

//let serverBase = process.env.SERVERBASE

//const requesterModule = require("./serverModuleRequesterUI.js")
//const labModule = require("./serverModuleLabUI.js")
//const dashBoardModule = require("./serverModuleDashboardUI.js")
const commonModule = require("./serverModuleCommonUI.js")
//const clinicalViewerModule = require("./serverModuleClinicalViewerUI")
const terminologyModule = require("./serverModuleTerminologyUI")
const modelModule = require("./serverModuleModel")
//const reviewModule = require("./serverModuleReview")
//const validatorModule = require("./serverModuleValidator")
const QModule = require("./serverModuleQ")
const libraryModule = require("./serverModuleLibrary")
const playgroundModule = require("./serverModulePlayground")

//const compVersionsModule = require("./serverModuleCompVersions")


//let config = require("./config.json")

let express = require('express');
//const fle = require("./samples/valenciaMay.json");
let app = express();
app.use(bodyParser.json({limit:'50mb',type:['application/json+fhir','application/fhir+json','application/json']}))
//app.use('/', express.static(__dirname,{index:'/poc.html'}));
app.use('/', express.static(__dirname,{index:'/csFrontPage.html'}));

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

//requesterModule.setup(app)
terminologyModule.setup(app)
modelModule.setup(app,mongoDbName,mongoUri)      //pass in the mongo database name to use
//validatorModule.setup(app)
QModule.setup(app,mongoDbName,mongoUri)
libraryModule.setup(app)
playgroundModule.setup(app,mongoDbName,mongoUri)

//common calls (not specifically related to requester or lab. ?move to separate module


app.get('/config', (req, res) => {
    res.json({
        logoUrl: process.env.APP_LOGO_URL || 'images/canshareLogo.png'
        //logoUrl: process.env.APP_LOGO_URL || 'images/sb-intersystems.png'
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

/*
//validate a StructureDefiniton
app.post('/validateSD', async function (req,res) {
    let SD = req.body

    let validationEP = `${serverBase}StructureDefinition/$validate`
    console.log(validationEP)
    try {
        let response = await axios.post(validationEP,SD)
        res.json(response.data)
    } catch (ex) {
        //console.log(ex.response.data)
        res.status(400).json(ex.response.data)
    }
})
*/

app.get('/config', async function(req,res){

    let config = {
        "PORT":process.env.PORT,
        "MONGODB":process.env.MONGODB
    }

    res.json(config)
})



//send in an array of queries. Execute them and add all the results into a single bundle
//If the query doesn't start with 'http' then execute against the POC server
//todo - if we want to, could change to parallel execution...
//https://javascript.plainenglish.io/running-multiple-requests-with-async-await-and-promise-all-e178ae318654
app.post('/multiqueryDEP',async function(req,res){
    let arQueries = req.body
    let fullBundle = {resourceType : "Bundle", type :'collection', entry:[]}

    if (arQueries.length > 0) {
        for (const qry of arQueries) {


            let resource = await commonModule.singleQuery(qry)  //will follow any paging

            //the response will either be a bundle (if a query) or a single resource (if a GET)
            if (resource) {
                if (resource.resourceType == 'Bundle') {
                    if (resource.entry) {
                        console.log('multi query:',qry,resource.entry.length)
                        resource.entry.forEach(function (entry) {
                            fullBundle.entry.push(entry)
                        })
                    }
                } else {
                    let entry = {resource:resource}
                    fullBundle.entry.push(entry)
                }
            }

        }
    }

    res.json(fullBundle)


})


//execute a single query, following paging.
//If the query doesn't start with 'http' then execute against the POC server
app.get('/proxyDEP',async function(req,res){

    //the query was url encoded so it could be passed to the server
    let query = decodeURIComponent(req.query.qry);
console.log(query)
    try {
        let bundle = await commonModule.singleQuery(query)
        //console.log(bundle)
        res.json(bundle)
    } catch (ex) {

        res.status(400).json(ex)
    }


})

server = http.createServer(app).listen(port);
console.log("Server listening on port " + port)
