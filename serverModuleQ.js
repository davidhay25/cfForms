

//let MongoClient = require('mongodb').MongoClient;
//et database        //this will be the database connection
const path = require('path');
const axios = require("axios");
const { ObjectId } = require("mongodb");

//async function setup(app,mongoDbName,uri) {
async function setup(app,database) {

    //check that the collection (adhocQ or publishQ) does not already have a Q with this url & version
    async function checkQVersion(Q,colName) {
        let url = Q.url
        let version = Q.version
        if (!url || !version) {
            return "Questionnaires must have a url, version and publisher to be stored"

        }

        try {

            //there can only be a single url / version combo
            let query = {url: url, version: version}
            let result = await database.collection(colName).find(query).toArray()
            if (result.length > 0) {
                return `There is already a Questionnaire with the url ${url} and version ${version}`

            }

        } catch(ex) {
            return "Unable to access database"

        }
    }





    app.get('/q/getQFromUrl',async function(req,res) {
        const { server, url } = req.query;

        //console.log(server,url)
        const [baseUrl, version = null] = url.split('|');

        //if the url is a canshare one, get it from the local db
        if (url.indexOf('canshare.co.nz') >-1) {
            //if there is a version then get that one.
            if (version) {
                let query={url:baseUrl,version:version}

              //  console.log(query)

                const cursor = await database.collection("publishedQ").find(query).toArray()
                switch (cursor.length) {
                    case 0 :
                        res.status(404).json({msg:"No matching Q found on the canshare server"})
                        break
                    case 1 :
                        let q = cursor[0]
                        delete q['_id']
                        res.json({q:q})
                        break
                    default :
                        res.status(400).json({msg:`${cursor.length}  Questionnaires with the version ${version} found`})
                        break

                }

            } else {
                //if no version, then just get the latest one. We can assume a numeric version - as it's cansher
                const q = await database.collection("publishedQ").aggregate([
                    { $match: { url: baseUrl } },
                    { $addFields: { versionNumeric: { $toDouble: "$version" } } },
                    { $sort: { versionNumeric: -1 } },
                    { $limit: 1 },
                    { $project: { versionNumeric: 0 } }
                ]).next();

                //console.log(q)

                if (q) {
                    delete q['_id']
                    res.json({q:q, msg:`No version was specified, this is the most recent Q with the url ${baseUrl}`})
                } else {
                    res.status(404).json({msg:`No Q found with the url ${baseUrl} on the CanShare server`})
                }
            }

        } else {
            //make a call to the term server
            let formManager = server.endsWith('/') ? server : server + '/';
            if (version) {
                //a specific version
                let qry = `${formManager}Questionnaire?url=${baseUrl}&version=${version}`
                let response = await axios.get(qry)     //a bundle or OO
                let bundle = response.data
                if (bundle.entry?.length == 1) {
                    res.json({q:bundle.entry[0].resource})
                } else {
                    if (bundle.entry?.length == 0) {
                        res.status(404).json({msg:`No single Q with the url ${baseUrl} & version ${version} was found`})
                    } else {
                        res.status(404).json({msg:`There were ${bundle.entry?.length} Questionnaires with the url ${baseUrl} & version ${version} found on the server ${formManager}`})
                    }

                }
            } else {
                //if there is no version then query on url and just choose one
                let qry = `${formManager}Questionnaire?url=${baseUrl}`
                let response = await axios.get(qry)     //a bundle or OO
                let bundle = response.data
                if (bundle.entry?.length > 0) {
                    res.json({q:bundle.entry[0].resource,msg:`There were ${bundle.entry?.length} found. This is just the first returned. `})
                } else {
                    res.status(404).json({msg:`No Q found with the url ${baseUrl} on the server: ${formManager}`})
                }
            }
        }
    })

    //when a Q is published from the designer
    app.post('/q/publish',async function(req,res){
        let Q = req.body
        try {





            await database.collection("publishedQ").insertOne(Q)
            res.json(Q)
        } catch(ex) {
            console.log(ex)
            res.status(500).json(ex.message)
            return
        }
    })

    app.put('/q/publishedStatus/:table/:recordId/:status',async function(req,res){
        //let table = req.params.table    //publishedQ = published Q, adhocQ = library
        let recordId =  req.params.recordId
        let status =  req.params.status
       // console.log(recordId,status)
        let collectionName = req.params.table    //publishedQ = published Q, adhocQ = library


        try {
            await database.collection(collectionName).updateOne(
                { _id: new ObjectId(recordId) },
                { $set: { status: status } }
            );
            res.json()
        } catch(ex) {
            console.log(ex)
            res.status(500).json(ex.message)
        }


    })


    //get all the published Q - used for backup. This should be Ok as there won't be
    //that many
    app.get('/q/allCompleteDEP', async function(req,res) {
        try {
            const results = await database.collection("publishedQ").find().toArray()
            res.json(results)

        } catch(ex) {
            console.log(ex)
            res.status(500).json(ex.message)
        }
    })


    //get the most recent version of all published Q
    app.get('/q/all', async function(req,res) {
        try {
            const results = await database.collection("publishedQ").aggregate([

                // exclude deleted docs - added mar24
                {
                    $match: {
                        status: { $ne: "retired" }
                    }
                },

                // sort so the highest version is first
                { $sort: { key: 1, version: -1 } },

                // group by key, keep the first (highest version)
                {
                    $group: {
                        _id: "$url",
                        doc: { $first: "$$ROOT" }
                    }
                },

                // flatten out so you just get the document
                { $replaceRoot: { newRoot: "$doc" } },

                // only include the fields you want
                {
                    $project: {
                        _id: 0,           // optional: hide Mongo _id
                        id: 1,
                        url: 1,
                        name: 1,
                        title:1,
                        version:1,
                        description: 1,
                        status : 1,
                        date:1,
                        extension:1
                    }
                }
            ]).toArray();
            res.json(results)

        } catch(ex) {
            console.log(ex)
            res.status(500).json(ex.message)
        }
    })

    //get a specific version of a published Q
    app.get('/q/:name/v/:version', async function(req,res) {

        try {
            let name = req.params.name
            let version =  req.params.version
            //let version = parseInt( req.params.version)
            let query={name:name,version:version}

           // console.log(query)

            const cursor = await database.collection("publishedQ").find(query).toArray()
            switch (cursor.length) {
                case 0 :
                    res.status(404).json({msg:"No matching Q found"})
                    break
                case 1 :
                    let q = cursor[0]
                    delete q['_id']
                    res.json(q)
                    break
                default :
                    res.status(400).json({msg:`${cursor.length}  Questionnaires with the version ${version} found`})
                    break

            }


        } catch(ex) {
            console.log(ex)
            res.status(500).json(ex.message)
        }


    })

    //get all the versions of a published Q
    app.get('/q/:name/versions', async function(req,res) {
        let name = req.params.name
        let query={name:name,status: { $ne: "retired" }}

        try {
            const cursor = await database.collection("publishedQ").find(query).sort({version:-1}).toArray()

            res.json(cursor)

        } catch(ex) {
            console.log(ex)
            res.status(500).json(ex.message)
        }


    })


    //------ functions to interact with adHoc Q's in the Q viewer. ie not published ones.
    //------- may wish to combine published & adhoc later, but for now keep them separate...
    //note that the Q editor will also save to this collection if publishing in clinfhir


    //get a summary of Q by url for the selection display. No items
    //get the most recent version of all adHoc Q
    //this is now the library...


    app.get('/adhocq/all', async function(req,res) {
        try {
            const results = await database.collection("adhocQ").aggregate([
                // sort so the highest version is first
                { $sort: { key: 1, version: -1 } },

                // group by key, keep the first (highest version)
                {
                    $group: {
                        _id: "$url",
                        doc: { $first: "$$ROOT" }
                    }
                },

                // flatten out so you just get the document
                { $replaceRoot: { newRoot: "$doc" } },

                // only include the fields you want
                {
                    $project: {
                        _id: 0,           // optional: hide Mongo _id
                        id: 1,
                        url: 1,
                        name: 1,
                        title:1,
                        version:1,
                        publisher:1,
                        contact:1,
                        description: 1,
                        status : 1,
                        date:1
                    }
                }
            ]).toArray();


            res.json(results)

        } catch(ex) {
            console.log(ex)
            res.status(500).json(ex.message)
        }
    })

    //retrieve a single Q by url and version
    app.get('/adhocq', async function(req,res) {
        let url = req.query.url
        let version = req.query.version

        let query = {url:url,version:version}

        const cursor = await database.collection("adhocQ").find(query).toArray()
        switch (cursor.length) {
            case 0 :
                res.status(404).json({msg:"No matching Q found"})
                break
            case 1 :
                let q = cursor[0]
                delete q['_id']
                res.json(q)
                break
            default :
                res.status(400).json({msg:`${cursor.length}  Questionnaires with the version ${version} found`})
                break

        }

    })
    //save an adHocQ. If the url/version combo exists then reject...

    app.post('/adhocq/publish',async function(req,res){
        let Q = req.body
        let url = Q.url
        let version = Q.version
        if (! url || ! version ) {
            let msg = "Questionnaires must have a url, version and publisher to be stored"
            res.status(422).json({msg:msg,code:'missingdata'})
            return
        }

        try {

            //there can only be a single url / version combo
            let query = {url:url,version:version}
            let result = await database.collection("adhocQ").find(query).toArray()
            if (result.length > 0) {
                let msg = `There is already a Questionnaire with the url ${url} and version ${version}`
                res.status(422).json({msg:msg,code:'duplicateversion'})
                return
            }

            await database.collection("adhocQ").insertOne(Q)

            res.json()

        } catch(ex) {
            console.log(ex)
            res.status(500).json(ex.message)

        }
    })




    //---- QR functions

    //return all QRs - pathQ
    app.get('/qr/all', async function(req,res) {
        try {
            const cursor = await database.collection("pathQR").find().sort({runDate:-1}).toArray()
            res.json(cursor)

        } catch(ex) {
            console.log(ex)
            res.status(500).json(ex.message)
        }
    })

    //upload QR's created by AI function creating QR from dictated reports
    app.post('/qr/upload',async function(req,res){
        let upload = req.body
        for (let item of upload) {

            const query = {runId:item.runId}
            try {
                await database.collection("pathQR").replaceOne(query,item,{upsert:true})
            } catch(ex) {
                console.log(ex)
                res.status(500).json(ex.message)
                return

            }
        }

        res.json({})


    })

    //--- testing

    app.get('/fpLabTest', async function(req,res){
        try {
            // Construct the absolute path to your file
            const filePath = path.join(__dirname, './labIntegration.html');

            // Send the file
            res.sendFile(filePath, err => {
                if (err) {
                    console.error('Error sending file:', err);
                    res.status(err.status || 500).send('Error sending file');
                }
            });

        } catch (err) {
            console.error('Error in /fpLabTest route:', err);
            res.status(500).send(`Server error: ${err.message}`);
        }

    })

}

module.exports = {
    setup : setup
};