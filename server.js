/*
    The main server for the tooling. Orginally for the POC but evolved since then
    start with ./localrun.sh which supplies the environment variables see below
*/


let http = require('http');
const axios = require("axios");

const termServerUrl = process.env.TERM_SERVER_URL || 'https://r4.ontoserver.csiro.au/fhir/'
const environment = process.env.ENVIRONMENT || 'canshare'       //allows for environment specific behaviours
const setting = process.env.SETTING

//the port that the POC server listens on for HTML & API calls
let port = process.env.PORT || 9500

//the Mongo database used by the models (and associated) apps
const mongoDbName = process.env.MONGODB || "clinfhir"
//nov7const bodyParser = require('body-parser')

console.log("")
console.log(`Server: Mongo database name is ${mongoDbName}`)



//const commonModule = require("./serverModuleCommonUI.js")
const terminologyModule = require("./serverModuleTerminologyForms")
const modelModule = require("./serverModuleModel")
const QModule = require("./serverModuleQ")
const libraryModule = require("./serverModuleLibrary")
const playgroundModule = require("./serverModulePlayground")
const adminModule = require("./serverModuleAdmin")


let express = require('express');
const {MongoClient} = require("mongodb");
let app = express();
//nov 7app.use(bodyParser.json({limit:'50mb',type:['application/json+fhir','application/fhir+json','application/json']}))

app.use('/', express.static(__dirname,{index:'/formsFrontPage.html'}));

//from chatGPT to allow call from elsewhere
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*'); // Allow all origins
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE'); // Allowed methods
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization'); // Allowed headers
    next();
});

app.use(express.json({ limit: '50mb' , type: ['application/json', 'application/fhir+json', 'application/json+fhir']}));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

let mongoHostName = process.env.MONGOHOSTNAME || "127.0.0.1"
let qUrlPrefix = process.env.QURLPREFIX || "http://canshare.co.nz/questionnaire"

const mongoUri = `mongodb://${mongoHostName}:27017`  //local machine
console.log(`Mongo connection uri is ${mongoUri}`)

console.log(`Default terminology server is ${termServerUrl}`)

let systemConfig = {
    setting : setting,
    environment : environment,
    mongoDb: mongoDbName,
    logoUrl: process.env.APP_LOGO_URL || 'images/canshareLogo.png',
    termServerUrl : termServerUrl,
    qUrlPrefix : qUrlPrefix,
    defaultVsPrefix : "https://nzhts.digital.health.nz/fhir/ValueSet"  //often the vs url is just the name...

}

console.log("Config:")
console.log(systemConfig)


async function setup() {
    const client = new MongoClient(mongoUri);
    let database = client.db(mongoDbName)
    await client.connect()
    console.log(`Connected to database ${mongoUri} at ${mongoHostName}`)

    adminModule.setup(app,database,client)  //the admin uses the client object to get the full database list
    terminologyModule.setup(app,termServerUrl)
    modelModule.setup(app,database)      //pass in the mongo database name to use
    QModule.setup(app,database)
    libraryModule.setup(app,client)
    playgroundModule.setup(app,database)

}
setup()


//common calls (not specifically related to requester or lab. ?move to separate module
//ontoserver -

app.get('/config', (req, res) => {
    res.json(systemConfig);
});




server = http.createServer(app).listen(port);
console.log("Server listening on port " + port)
