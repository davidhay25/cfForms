//functions to provide terminology services for the clinFHIR forms module
//a stripped down version of serverModuleTerminologyUI keeping only the forms terminology requirements

const axios = require("axios");
const fs = require("fs")



let isNZHTS = false
//let termServerUrl = process.env.TERM_SERVER_URL || 'https://backup.canshare.co.nz/proxy/' //todo change default to ontoserver
let termServerUrl = process.env.TERM_SERVER_URL || 'https://r4.ontoserver.csiro.au/fhir/' //todo change default to ontoserver

//this isn't the most elegant way to see if this is running under canshare. ?Should we look for the whole string??
if (termServerUrl.indexOf('authoring') > -1) {
    isNZHTS = true
    //This is the actual NZHTS server root
    termServerUrl = "https://authoring.nzhts.digital.health.nz/fhir/"
}




//load the config file for accessing NZHTS (the file is excluded from git)
const nzhtsconfig = JSON.parse(fs.readFileSync("./nzhtsconfig.config").toString())

let currentToken = {token:null,expires:null}    //expires is the date.getTime() of when the token expires

async function getNZHTSAccessToken() {
    //if this isn't canshare (nzhts) then we can just return an empty token...
    if (! isNZHTS) {
        return {}
    }


    //If there is a saved token then check the expiry and if not expired then return immediately.
    //Otherwise, get a new token..
    if (currentToken.token) {
        let now = new Date().getTime()
        if (now < currentToken.expires) {
            //console.log('re-use token')
            return currentToken.token
        }
    }

    let url = "https://authenticate.nzhts.digital.health.nz/auth/realms/nzhts/protocol/openid-connect/token"
    let body =`grant_type=client_credentials&client_id=${nzhtsconfig.clientId}&client_secret=${nzhtsconfig.clientSecret}`
    try {
        let result = await axios.post(url,body)
        //if here, then we need a new token
        let expires = result.data['expires_in']     //number of seconds till expiry. Currently 24 hours...
        currentToken.token = result.data['access_token']
        //set the expiry to an hour (even though, in theory, we have 24 hours)
        currentToken.expires = new Date().getTime() + 60 * 60 * 1000


        return currentToken.token
    } catch (ex) {
        console.log(ex)
        return null
    }
}


function setup(app, termServerUrl) {

/*
    app.get('/token',async function (req,res) {
        let token = await getNZHTSAccessToken()
        res.json({token:token,url:"https://authoring.nzhts.digital.health.nz/fhir"})
    })
    */
    //-----------------------------------------------



    //this is used for terminology queries from the fpLab to the NZHTS.
    //it always goes to NZHTS
    //note that in clinFhir, the TS will be ontoserver (unless there's a different TS) so this won't get called. It's likely only canshare
    app.get('/proxy/*path',async function(req,res){

        const targetPath = req.params.path


        let qry = `${nzhtsconfig.serverBaseAuthor}${targetPath}`

        console.log(`proxying query: ${qry}`)

        if (req.originalUrl.indexOf('$expand') > -1) {
            qry += "&displayLanguage=en-x-sctlang-23162100-0210105"
        }

        let token = await getNZHTSAccessToken()
        //console.log(`nzhts query: ${req.query.qry}`)
        if (token) {

            let config = {headers:{authorization:'Bearer ' + token}}
            config['content-type'] = "application/fhir+json"

            axios.get(qry,config).then(function(data) {

                res.json(data.data)

            }).catch(function(ex) {
                if (ex.response) {
                    //console.log("----- NOT found -----")
                    res.status(ex.response.status).json(ex.response.data)
                } else {
                    res.status(500).json(ex)
                }

            })
        } else {

            res.status(500).json({msg:"Unable to get Access Token."})
        }



    })



    //general queries against the Terminology Server
    //even though it's NZHTS - it uses the configured terminology server
    app.get('/nzhts',async function(req,res){
      /*  let query = req.query.qry

        let headers = req.headers

        //The instance of the TS server that will be queried
        let tsInstance = nzhtsconfig.serverBaseAuthor
        if (headers['x-ts-instance'] == 'prod') {
            tsInstance = nzhtsconfig.serverBaseProd
        }

*/

        //disabling wth term server down...

        //let qry = req.query.query || `https://authoring.nzhts.digital.health.nz/fhir/ValueSet/$expand?url=https://nzhts.digital.health.nz/fhir/ValueSet/canshare-data-absent-reason`

        if (req.query.qry) {
            let qry = termServerUrl +  decodeURIComponent(req.query.qry)

            //need to re-urlencode the |
            qry = qry.split('|').join("%7c")



            let token = await getNZHTSAccessToken()
            //console.log(`nzhts query: ${req.query.qry}`)
            if (token) {

               // var decoded = jwt_decode(token);
                // let timeToExpire = decoded.exp * 1000 - Date.now()       //exp is in seconds
                // console.log(timeToExpire / (1000 * 60 *60 ));

                let config = {headers:{authorization:'Bearer ' + token}}
                config['content-type'] = "application/fhir+json"

                //console.log('general query:',qry)

                axios.get(qry,config).then(function(data) {

                    res.json(data.data)

                }).catch(function(ex) {
                    console.log(ex)
                    if (ex.response) {
                        //console.log("----- NOT found -----")
                        res.status(ex.response.status).json(ex.response.data)
                    } else {
                        res.status(500).json(ex)
                    }

                })
            } else {

                console.log("Unable to get Access Token.")
                res.status(500).json({msg:"Unable to get Access Token"})
            }
        } else {
            res.status(400).json({msg:"Must have urlencoded qry query"})

        }


    })


    app.get('/termQuery',async function(req,res) {

        //the query was url encoded so it could be passed to the server. It is the full query (including server)
        let query = decodeURIComponent(req.query.qry);
        console.log(query)

        try {
            let result = await axios.get(query)
            res.json(result.data)
        } catch (ex) {
            if (ex.response) {
                res.status(400).json(ex.response.data)
            } else {
                res.status(500).json({})
            }
        }
    })
}


module.exports = {
    setup : setup
};