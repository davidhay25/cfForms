
/*
* Interface with the mongodb server to get model data
* Each database has a version of the LIM
*   A version is created by making a copy of the current (like conman)
* Collections:
*   dataGroup - all datagroups
*   composition - all compositions
*   snapshot - composition snapshots created within this version.
*       each entry in the snapshot has the composition and a copy of all the DG (could limit to just those referenced by the composition)
*
* */

const axios = require("axios");

//const gofshClient = require('gofsh').gofshClient;//.gofshClient
const sushiClient = require('fsh-sushi').sushiClient;
//const serverModuleIg = require('./serverModuleIG')

const fhirResourceTypes = require('./artifacts/resourceElementsR4.json')

// https://www.mongodb.com/developer/languages/javascript/node-connect-mongodb/

let MongoClient = require('mongodb').MongoClient;
let database        //this will be the database connection

//just a test function
async function listDatabasesDEP(client){
    databasesList = await client.db().admin().listDatabases();
    console.log("Databases:");
    databasesList.databases.forEach(db => console.log(` - ${db.name}`));
}

//save a DG in the history.
async function saveHistory(DG,userEmail,comment) {
    let vo = {date: new Date(), type:'dg',name:DG.name,user:userEmail,content:DG}
    if (comment) {
        vo.comment = comment
    }
    //console.log('pre hx')
    await database.collection("history").insertOne(vo)
    //console.log('post hx')
}

function sendErrorNotification(data) {
    axios.post("https://maker.ifttt.com/trigger/poc_error/json/with/key/dUZYc-uqt_dac43pA5twl4",data)
}

//return true if the 2 models are different
function isDifferent(model1,model2) {
    delete model1['_id']
    delete model2['_id']
    if (JSON.stringify(model1) !== JSON.stringify(model2)) {
        return true
    }
}

async function setup(app,mongoDbName,uri) {
    console.log("Setting up connection to mongodb in serverModuleModel")

    //const uri = "mongodb+srv://canshare:meUQP7RjdaVVTMuS@cluster0.okom61e.mongodb.net/?retryWrites=true&w=majority"

   // const uri = "mongodb://127.0.0.1:27017"  //local machine
    const client = new MongoClient(uri);
    database = client.db(mongoDbName)




    await client.connect()
    //await listDatabases(client)
    console.log("model connected")

    //==== access

    //record an access
    app.post('/model/access', async function(req,res) {
        let clientIp = req.headers['x-forwarded-for'] ||
            req.connection.remoteAddress ||
            req.socket.remoteAddress ||
            req.connection.socket.remoteAddress
        let doc = {ip:clientIp,date: new Date()}
        try {
            await database.collection("access").insertOne(doc)
            res.json(doc)
        } catch (ex) {
            console.log(ex)
            res.status(500).json(ex.message)
        }


    })

    // =========== These are an entry for each change in the model Telemetry is for errors
    app.post('/trace', async function(req,res) {

        let doc = req.body
        doc.date = new Date()

        try {
            await database.collection("trace").insertOne(doc)
            res.json(doc)
        } catch (ex) {
            console.log(ex)
            res.status(500).json(ex.message)
        }

    })

    //db.getCollection("trace").find({date:{"$gte":new Date("2023-11-14")}}).count()

    //retrieve the trace records
    app.get('/trace', async function(req,res) {
        let query = {}

        let limit = 500
        if (req.query.count) {
            limit = parseInt(req.query.count)
        }

        if (req.query.days) {
            //the number of days to show
           // query.date = {"$gte"}
        }

        const options = {sort: { date : -1 },limit:limit}

        //console.log(options)

        try {
            const cursor = await database.collection("trace").find(query,options).toArray()
            res.json(cursor)
        } catch(ex) {
            console.log(ex)
            res.status(500).json(ex.message)

        }

    })



    //========= telemetry

    app.post('/telemetry', async function(req,res) {
        console.log('err',req.body)
        let clientIp = req.headers['x-forwarded-for'] ||
            req.connection.remoteAddress ||
            req.socket.remoteAddress ||
            req.connection.socket.remoteAddress

        let doc = req.body
        doc.ip = clientIp
        doc.date = new Date()

        try {
            await database.collection("telemetry").insertOne(doc)
            sendErrorNotification(doc)
            res.json(doc)
        } catch (ex) {
            console.log(ex)
            res.status(500).json(ex.message)
        }

       // res.json()
    })

    app.get('/telemetry', async function(req,res) {
        let query = {}
        const options = {sort: { date : -1 }}
        try {
            const cursor = await database.collection("telemetry").find(query,options).toArray()
            res.json(cursor)
        } catch(ex) {
            console.log(ex)
            res.status(500).json(ex.message)

        }

    })


    //======== datagroups  =========================

    //get the DG index for the IG
    //todo >>>>>>> not currently used
    app.get('/model/dgIndexDEP', async function(req,res) {
        //retrieve all the active DGs
        let query = {active:true} // active: { $lt: 15 } };

        //console.log('query',query)
        const colDG = database.collection("dg");

        try {
            const cursor = await colDG.find(query).toArray()
            let hashDG = {}
            cursor.forEach(function (doc) {
                delete doc['_id']
                delete doc.diff
                hashDG[doc.name] = doc

            })

            let index = serverModuleIg.makeDGIndex(hashDG)
            res.json(index)
        } catch(ex) {
            console.log(ex)
            res.status(500).json(ex.message)

        }
    })


    //get all active datagroups
    app.get('/model/allDG', async function(req,res) {
        //retrieve all the DG
        let query = {active:true} // active: { $lt: 15 } };
        if (req.query.includeDeleted) {
            query = {}
        }
        console.log('query',query)
        const colDG = database.collection("dg");

        try {
            const cursor = await colDG.find(query).toArray()
            let arDG = []
            cursor.forEach(function (doc) {
                delete doc['_id']
                arDG.push(doc)
            })

            res.json(arDG)
        } catch(ex) {
            console.log(ex)
            res.status(500).json(ex.message)

        }
    })


    //get the count of history items for a DG
    app.get('/model/DG/:name/history/count', async function(req,res) {
        let name = req.params.name

        const query = {name:name,type:'dg'}
        try {
            const cursor = await database.collection("history").find(query).toArray()
            res.json(cursor.length)
        } catch(ex) {
            console.log(ex)
            res.status(500).json(ex.message)
        }
    })

    //delete a DG - todo  - why not use delete verb??
    app.put('/model/DG/:name/delete', async function(req,res) {
        let dg = req.body
        dg.active = false

        let userEmail = req.headers['x-user-email'] || "unknown User"
        let query = {name:req.params.name}
        let update = {$set:{active:false}}
        try {
            await database.collection("dg").updateOne(query,update,{upsert:false})

            //update the history
            await saveHistory(dg,userEmail ,"deleting a document")

            res.json()

        } catch(ex) {
            console.log(ex)
            res.status(500).json(ex.message)
        }
    })

    //undo a checkout on a DG
    app.put('/model/DG/:name/revert', async function(req,res) {
        let name = req.params.name
        let userEmail = req.headers['x-user-email']

        const query = {name:name}
        try {
            //strategy is to get the library copy, then update it in a second call as the replaceOne doesn't return the updated doc
            const cursor = await database.collection("dg").find(query).toArray()
            if (cursor.length == 1) {

                let dg = cursor[0]
                delete dg['_id']
                delete dg.checkedOut
                //update the DG
                await database.collection("dg").replaceOne(query,dg,{upsert:true})

                //update the history
                await saveHistory(dg,userEmail || "unknown User","Reverting a checkout")

                res.json(dg)
            } else {
                res.status(404).json({msg:`There were ${cursor.length} occurrences of the DG ${name}`})
            }
        } catch(ex) {
            console.log(ex)
            res.status(500).json(ex.message)
        }

    })

    //get the history of a DG
    app.get('/model/DG/:name/history', async function(req,res) {
        let name = req.params.name


        const query = {name:name,type:'dg'}
        const options = {sort: { date : -1 }}
        try {
            const cursor = await database.collection("history").find(query,options).toArray()
            res.json(cursor)


        } catch(ex) {
            console.log(ex)
            res.status(500).json(ex.message)

        }
    })


    //get a single DG by name
    app.get('/model/DG/:name', async function(req,res) {
        let name = req.params.name

        const query = {name:name}
        try {
            const cursor = await database.collection("dg").find(query).toArray()
            if (cursor.length == 1) {
                let comp = cursor[0]
                delete comp['_id']
                res.json(comp)
            } else {
                if (cursor.length == 0) {
                    res.status(404).json({msg:'DG not found'})
                } else {
                    res.status(500).json({msg:`There were ${cursor.length} DGs with this name. This shouldn't happen.`})
                }

            }
        } catch(ex) {
            console.log(ex)
            res.status(500).json(ex.message)

        }


    })

    //create / update a single DG. In theory the name param is not needed, but cleaner
    app.put('/model/DG/:name', async function(req,res) {
        let name = req.params.name
        let dg = req.body
        dg.active = true

        let userEmail = req.headers['x-user-email']

        if (! userEmail) {
            res.status(400).json({msg:'must be a logged in user'})
            return
        }

        const query = {name:name}
        try {
            const cursor = await database.collection("dg").replaceOne(query,dg,{upsert:true})
            await saveHistory(dg,userEmail || "unknown User")

            res.json(dg)
        } catch(ex) {
            console.log(ex)
            res.status(500).json(ex.message)

        }
    })

    //receive a hash of DG (the hashAllDG) and update the server.
    //start with a simple update for now - get fancier later

    app.post('/model/DG/DEP', async function(req,res) {


        let vo = req.body  //{user: hashAllDG: }

        let hashAllDG = vo.hashAllDG

        //should alway be an email as only logged in users can update
        let userEmail = "unknown"
        if (vo.user) {
            userEmail = vo.user.email
            console.log(vo.user)
        }

        //Updating each one individually as we need to check for checked out status

        let outcomes = []        //the history of changes (or not)

        try {

            //let backup = {type:'hashDG',date: new Date(), data:hashAllDG}
            //await database.collection("backup").insertOne(backup)

            //hash is keyed on dg.name
            for (const key of Object.keys(hashAllDG)) {
                //console.log(key)
                let dg = hashAllDG[key]
                dg.active = true        //to provide a way to de-activate DG's. The query will only return active ones.
                dg.lastUpdate = userEmail   //record the person that last updated
                delete dg['_id']

                //first, retrieve the current DG
                const findQuery = {name:dg.name}
                const findCursor = await database.collection("dg").find(findQuery).toArray()

                switch (findCursor.length) {
                    case 0 :
                        //this is a new DG - it can be saved

                        await database.collection("dg").insertOne(dg)

                        await saveHistory(dg,userEmail)

                        outcomes.push({name:dg.name,saved:true,message:"New resource"})
                        break
                    case 1 :
                        let libraryDG = findCursor[0]   //todo check for > 1 - that shouldn't happen ? can the db have a constraint
                        if (libraryDG.checkedOut) {
                            //this is checked out to someone
                            if (userEmail && (userEmail == libraryDG.checkedOut)) {
                                //checked out to this user - OK to update
                                //only update if the contents have changed
                                if (isDifferent(dg,libraryDG)) {
                                    const query = {name:dg.name}
                                    await database.collection("dg").replaceOne(query,dg,{upsert:true})
                                    await saveHistory(dg,userEmail)
                                    outcomes.push({name:dg.name,saved:true,message:"Updated"})
                                } else {
                                    outcomes.push({name:dg.name,saved:false,message:"Not changed"})
                                }


                            } else {
                                //checked out to someone else - don't update, or save in the history
                                outcomes.push({name:dg.name,saved:false,message:`checked out to ${libraryDG.checkedOut}`})

                                await saveHistory(dg,userEmail)

                            }

                        } else {
                            //exists in the library, but not checked out. So can save.
                            let libraryDG = findCursor[0]

                            if (isDifferent(dg,libraryDG)) {
                                const query = {name: dg.name}
                                await database.collection("dg").replaceOne(query, dg, {upsert: true})
                                await saveHistory(dg, userEmail)
                                outcomes.push({name: dg.name, saved: true, message: "Updated"})
                            } else {
                                outcomes.push({name:dg.name,saved:false,message:"Not changed"})
                            }
                        }
                        break
                    default :
                        //this is an error - shouldn't happen
                        outcomes.push({name:dg.name,saved:false,message:`There were ${findCursor.length} resources with that name.`})
                        break

                }


            }
            res.json(outcomes)


        } catch(ex) {
            console.log(ex)
            res.status(500).json(ex.message)

        }
    })

    // ============ compositions ========================

    //get all active compositions - used by the library
    app.get('/model/allCompositions', async function(req,res) {
        //using deleted rather than active as there were a number of compositions already before I implemented the delete :(

        let query = {deleted:{$ne : true}}  // bring them all back ATM{active:true} // active: { $lt: 15 } };
        if (req.query.includeDeleted) {
            query = {}
        }



        try {
            const cursor = await database.collection("comp").find(query).toArray()
            let arComp = []
            cursor.forEach(function (doc) {
                delete doc['_id']
                arComp.push(doc)
            })
            res.json(arComp)
        } catch(ex) {
            console.log(ex)
            res.status(500).json(ex.message)

        }
    })

    //delete a Composition- not a delete as we
    app.put('/model/comp/:name/delete', async function(req,res) {
        let comp = req.body
        comp.deleted = true

        let userEmail = req.headers['x-user-email'] || "unknown User"
        if (! userEmail) {
            res.status(400).json({msg:"No username provided"})
            return
        }

        let query = {name:req.params.name}
        let update = {$set:{deleted:true}}
        try {
            await database.collection("comp").updateOne(query,update,{upsert:false})

            //update the history
            await saveHistory(comp,userEmail ,"deleting a composition")

            res.json()

        } catch(ex) {
            console.log(ex)
            res.status(500).json(ex.message)
        }
    })


    //undo a checkout on a Composition
    app.put('/model/comp/:name/revert', async function(req,res) {
        let name = req.params.name
        let userEmail = req.headers['x-user-email']

        if (! userEmail) {
            res.status(400).json({msg:'must be a logged in user'})
            return
        }

        const query = {name:name}
        try {
            //strategy is to get the library copy, then update it in a second call as the replaceOne doesn't return the updated doc
            const cursor = await database.collection("comp").find(query).toArray()
            if (cursor.length == 1) {

                let comp = cursor[0]
                delete comp['_id']
                delete comp.checkedOut
                //update the Composition
                await database.collection("comp").replaceOne(query,comp,{upsert:true})

                //update the history
                await saveHistory(comp,userEmail || "unknown User","Reverting a checkout composition")

                res.json(comp)
            } else {
                res.status(404).json({msg:`There were ${cursor.length} occurrences of the Composition ${name}`})
            }
        } catch(ex) {
            console.log(ex)
            res.status(500).json(ex.message)
        }

    })


    //get a single composition by name
    app.get('/model/comp/:name', async function(req,res) {
        let name = req.params.name
        const query = {name:name}
        try {
            const cursor = await database.collection("comp").find(query).toArray()
            if (cursor.length == 1) {
                let comp = cursor[0]
                delete comp['_id']
                res.json(comp)
            } else {
                res.status(404).json({msg:'Composition not found, or there are multiple with the same name'})
            }
        } catch(ex) {
            console.log(ex)
            res.status(500).json(ex.message)

        }
    })


    //create / update a single composition. In theory the name param is not needed, but cleaner
    app.put('/model/comp/:name', async function(req,res) {

        let userEmail = req.headers['x-user-email']

        if (! userEmail) {
            res.status(400).json({msg:'must be a logged in user'})
            return
        }

        let name = req.params.name
        let comp = req.body
        delete comp['_id']
        comp.updated = true           //so we know it was updated
        const query = {name:name}
        try {
            const cursor = await database.collection("comp").replaceOne(query,comp,{upsert:true})
            await saveHistory(comp,userEmail || "unknown User")
            res.json(comp)
        } catch(ex) {
            console.log(ex)
            res.status(500).json(ex.message)

        }


    })

    //todo return all Compositions that reference this DG
    app.get('/model/comp/:name/dg', async function(req,res) {

    })

    //get a single named query
    app.get('/model/namedquery/:name', async function(req,res) {
        let query = {name:req.params.name}
        try {
            console.log(`gettting ${query}`)
            const cursor = await database.collection("namedquery").find(query).toArray()
            let arQuery = []
            console.log(cursor)

            if (cursor && cursor.length == 1) {
                res.json(cursor[0])
            } else {

                res.status(404).json({})

            }

        } catch(ex) {
            console.log(ex)
            res.status(500).json(ex.message)

        }
    })

    //get all named queries
    app.get('/model/namedquery', async function(req,res) {

        let query = {active:true}
        try {
            const cursor = await database.collection("namedquery").find(query).toArray()
            let arQuery = []
            cursor.forEach(function (doc) {
                delete doc['_id']
                arQuery.push(doc)
            })
            res.json(arQuery)
        } catch(ex) {
            console.log(ex)
            res.status(500).json(ex.message)

        }
    })


    //add / edit named query
    //create / update a single named query. In theory the name param is not needed, but cleaner
    app.put('/model/namedquery/:name', async function(req,res) {

        let namedquery = req.body
        const query = {name:namedquery.name}
        try {
            const cursor = await database.collection("namedquery").replaceOne(query,namedquery,{upsert:true})

            res.json(namedquery)
        } catch(ex) {
            console.log(ex)
            res.status(500).json(ex.message)

        }


    })


    //--------------- FSH endpoints

    //------- DG
    //get the fsh for a DG profile
    app.get('/fsh/DG/:name', async function(req,res) {
        let name = req.params.name

        const query = {name:name}   //structure {name: fsh:}
        try {
            const cursor = await database.collection("dgProfileFsh").find(query).toArray()
            if (cursor.length == 1) {
                let comp = cursor[0]
                delete comp['_id']
                res.json(comp)
            } else {
                if (cursor.length == 0) {
                    res.status(404).json({msg:'FSH not found'})
                } else {
                    res.status(500).json({msg:`There were ${cursor.length} FSHs with this name. This shouldn't happen.`})
                }
            }
        } catch(ex) {
            console.log(ex)
            res.status(500).json(ex.message)

        }
    })

    //get all the fsh DG profiles in a single call.
    app.get('/fsh/profile/allDG', async function(req,res) {
        try {
            const cursor = await database.collection("dgProfileFsh").find({}).toArray()
            res.json(cursor)

        } catch(ex) {
            console.log(ex)
            res.status(500).json(ex.message)
        }
    })


    //create / update the profile fsh for a single DG profile. Includes extensions (as they are generated from the DG)
    app.put('/fsh/DG/:name', async function(req,res) {
        let name = req.params.name
        let fsh = req.body      //structure {name: fsh: manifest: extensions:}

        let userEmail = req.headers['x-user-email']

        if (! userEmail) {
            res.status(400).json({msg:'must be a logged in user'})
            return
        }

        const query = {name:name}
        try {
            const cursor = await database.collection("dgProfileFsh").replaceOne(query,fsh,{upsert:true})
            //await saveHistory(dg,userEmail || "unknown User")

            res.json(fsh)
        } catch(ex) {
            console.log(ex)
            res.status(500).json(ex.message)

        }
    })

    //-------- composition

    //All the composition profiles
    app.get('/fsh/profile/allComp', async function(req,res) {

        try {
            const cursor = await database.collection("compProfileFsh").find({}).toArray()
            res.json(cursor)

        } catch(ex) {
            console.log(ex)
            res.status(500).json(ex.message)

        }
    })

    //save the profile fsh for a composition
    app.put('/fsh/comp/profile/:name', async function(req,res) {
        let name = req.params.name
        let fsh = req.body      //structure {name: fsh:}

        let userEmail = req.headers['x-user-email']

        if (! userEmail) {
            res.status(400).json({msg:'must be a logged in user'})
            return
        }
        const query = {name:name}
        try {
            const cursor = await database.collection("compProfileFsh").replaceOne(query,fsh,{upsert:true})

            res.json(fsh)
        } catch(ex) {
            console.log(ex)
            res.status(500).json(ex.message)

        }
    })

    //All the composition models
    app.get('/fsh/logical/allComp', async function(req,res) {

        try {
            const cursor = await database.collection("compLogicalFsh").find({}).toArray()
            res.json(cursor)

        } catch(ex) {
            console.log(ex)
            res.status(500).json(ex.message)

        }
    })


    //save the logical fsh for a composition
    app.put('/fsh/comp/logical/:name', async function(req,res) {
        let name = req.params.name
        let fsh = req.body      //structure {name: fsh:}

        let userEmail = req.headers['x-user-email']

        if (! userEmail) {
            res.status(400).json({msg:'must be a logged in user'})
            return
        }
        const query = {name:name}
        try {
            const cursor = await database.collection("compLogicalFsh").replaceOne(query,fsh,{upsert:true})

            res.json(fsh)
        } catch(ex) {
            console.log(ex)
            res.status(500).json(ex.message)

        }
    })

    //---- misc

    //Run sushi to process fsh. keeping it as synchronous ATM
    app.post('/fsh/transform',function(req,res) {


        let fsh = req.body.fsh; //JSON.stringify(json.fsh);

        let fhirVersion = "4.0.1"
        if (req.body.fhirVersion) {
            fhirVersion = json.fhirVersion.version
        }



        if (fsh) {


            //let config = json.options || {}

            const options = {
                canonical: 'http://canshare.co.nz/fhir',
                version: '0.0.1',
                dependencies: [],
                logLevel: 'silent' ,
                fhirVersion : fhirVersion
            };

            void async function() {
                let results;
                try {
                    //console.log('start')
                    results = await sushiClient.fshToFhir(fsh, options);

                    console.log(results)
                    let str = JSON.stringify(results.fhir)


                } catch(ex) {
                    console.log(ex)

                    res.status(500);
                    res.json({err: ex.message});
                }

                res.json(results)

            }();
        } else {
            res.status(500);
            res.json({err: "No FSH supplied"});
        }


    })

    //create a summary of profiling. Currently a list of extensions usage
    app.get('/fsh/summary', async function(req,res) {
        const query = {}   //all dgfas
        try {
            const cursor = await database.collection("dgFsh").find(query).toArray()
            let hashUrl = {}        //A hash of where extensions are used
            cursor.forEach(function (doc) {
                let dgName = doc.name
                if (doc.manifest ) {
                    if (doc.manifest.extensions) {
                        Object.keys(doc.manifest.extensions).forEach(function (url) {
                            hashUrl[url] = hashUrl[url] || []
                            let arPaths = doc.manifest.extensions[url]
                            arPaths.forEach(function (item) {
                                let item1 = {dg:dgName,path:item.path,type:item.summary.type,name:item.summary.name}
                                hashUrl[url].push(item1)
                            })
                            
                        })
                    }
                }
            })
            res.json(hashUrl)

        } catch(ex) {
            console.log(ex)
            res.status(500).json(ex.message)
        }
    })


    //get all extensions
    //Only have a single entry per extension
    //todo - have an audit that looks for extensions with the same url defined differently
    app.get('/fsh/extensions', async function(req,res) {

        let format = req.query.format   //set to 'text' to get a textual format suitable for generation

        console.log(format)
        let hashExtensions = {}     //a hash of extensions keyed on url. Content is a list of {fsh: dgname:}

        let arText = []      //array for textual representation


        try {
            const cursor = await database.collection("dgFsh").find({}).toArray()
            cursor.forEach(function (doc) {
                if (doc.extensions) {
                    Object.keys(doc.extensions).forEach(function (url) {
                        hashExtensions[url] = hashExtensions[url] || []
                        let item = {dg:doc.name,fsh:doc.extensions[url]}

                        if (format == 'text' &&  hashExtensions[url].length == 0) { //only want one entry per url in the text. todo - see not about need for auditing
                            arText = arText.concat(doc.extensions[url])
                            arText.push('\n')
                        }
                        hashExtensions[url].push(item)
                    })
                }

            })

            if (format == 'text') {
                res.send(arText.join('\n'))
            } else {
                res.json(hashExtensions)
            }



        } catch(ex) {
            console.log(ex)
            res.status(500).json(ex.message)

        }


    })

    //get elements for a resource type. Uses the fhirResourceTypes object created for graphbuilder
    app.get('/fsh/fhirtype/:type', async function(req,res) {
        let type = req.params.type
        if (type && fhirResourceTypes[type]) {
            res.json(fhirResourceTypes[type])
        } else {
            res.status(404).json({msg:`Type ${type} unknown`})
        }

    })




    //--------------  publishing endpoints

    //publish a Comp to the published collection. A single comp (keyed by name) can have multiple versions
    app.post('/publish/comp', async function(req,res) {

        let userEmail = req.headers['x-user-email']

        if (! userEmail) {
            res.status(400).json({msg:'must be a logged in user'})
            return
        }

        //let name = req.params.name
        let package = req.body
        //console.log(comp)
        //todo - should we check that the version is unique?
        try {
            const cursor = await database.collection("publishedComp").insertOne(package)
            //await saveHistory(comp,userEmail || "unknown User")
            res.json(package)
        } catch(ex) {
            console.log(ex)
            res.status(500).json(ex.message)

        }

    })



    //get a single published composition. returns most recent versions
    app.get('/publish/comp/:name', async function(req,res) {
        let name = req.params.name
        let qry = {"comp.name":name}
        try {
            const cursor = await database.collection("publishedComp").find(qry).toArray()
            //returns package collection {comp: Q:}
            //console.log(cursor)
            let maxVersion = -1
            let currentPackage;
            cursor.forEach(function (package) {
                let version = package.comp.version || 1
                if (version > maxVersion) {
                    maxVersion = version
                    currentPackage = package
                }
            })

            res.json(currentPackage)

        } catch(ex) {
            console.log(ex)
            res.status(500).json(ex.message)

        }


    })

    //get the summary of all published compositions.
    //only include the most recent version
    app.get('/publish/comp', async function(req,res) {

        //const query = {name:name}
        try {
            const cursor = await database.collection("publishedComp").find().toArray()
            let hashComp = {}


            cursor.forEach(function (package) {
                delete package.comp.snapshot
                delete package.comp.override
                let name = package.comp.name

                console.log(package.comp)

                if (hashComp[name]) {
                    //make sure this is the most recent publication
                    let version = package.comp.version || 1
                    if (version > hashComp[name].version) {
                        hashComp[name] = package.comp
                    }
                } else {
                    hashComp[name] = package.comp
                }
            })
            res.json(hashComp)


        } catch(ex) {
            console.log(ex)
            res.status(500).json(ex.message)

        }
    })


    // ============== questionnnaire objects - not Q resources - deprecated



    //create / update a single QuestionnaireObject (QO).
    app.put('/Questionnaire/:name', async function(req,res) {
        let name = req.params.name
        let q = req.body



        const query = {"Q.name":name}
        //console.log(query)
        try {

            const cursor = await database.collection("questionnaire").replaceOne(query,q,{upsert:true})
            res.json(q)
        } catch(ex) {
            console.log(ex)
            res.status(500).json(ex.message)

        }
    })

    //get a list of all saved Qs  - removing the contents
    app.get('/Questionnaire/getSummary', async function(req,res) {
        try {
            const cursor = await database.collection("questionnaire").find({}).toArray()
            let ar = []
            cursor.forEach(function (doc) {
                delete doc['_id']
                delete doc.item
                delete doc.extension
                delete doc.useContext
                ar.push(doc)

            })

            res.json({lstQ:ar})
        } catch(ex) {
            console.log(ex)
            res.status(500).json(ex.message)

        }
    })

    //get a single Questionnaire by name
    app.get('/Questionnaire/:name', async function(req,res) {
        let name = req.params.name
        const query = {"Q.name":name}
        try {
            const cursor = await database.collection("questionnaire").find(query).toArray()
            if (cursor.length == 1) {
                let q = cursor[0]
                delete q['_id']
                res.json(q)
            } else {
                res.status(404).json({msg:'Q not found, or there are multiple with the same name'})
            }
        } catch(ex) {
            console.log(ex)
            res.status(500).json(ex.message)

        }
    })



    //get all active datagroups. For now, return the whiole thing - if size becomes an issue, then just return the meta element
    app.get('/model/allQObjectDEP', async function(req,res) {
        //retrieve the QO

        const colQO = database.collection("qobject");
        const query =  {}// {active:true} // active: { $lt: 15 } };
        try {
            const cursor = await colQO.find(query).toArray()
            let hashQO = {}
            cursor.forEach(function (doc) {
                delete doc['_id']
                hashQO[doc.name] = doc

            })

            res.json(hashQO)
        } catch(ex) {
            console.log(ex)
            res.status(500).json(ex.message)

        }
    })

    //get a single QO by name
    app.get('/model/QObject/:name', async function(req,res) {
        let name = req.params.name
        const query = {name:name}
        try {
            const cursor = await database.collection("qobject").find(query).toArray()
            if (cursor.length == 1) {
                let qo = cursor[0]
                delete qo['_id']
                res.json(qo)
            } else {
                res.status(404).json({msg:'Q not found, or there are multiple with the same name'})
            }
        } catch(ex) {
            console.log(ex)
            res.status(500).json(ex.message)

        }
    })







}



//------------ create FSH





module.exports = {
    setup : setup
};


