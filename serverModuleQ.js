

//let MongoClient = require('mongodb').MongoClient;
//et database        //this will be the database connection
const path = require('path');

//async function setup(app,mongoDbName,uri) {
async function setup(app,database) {


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

    //get the most recent version of all published Q
    app.get('/q/all', async function(req,res) {
        try {
            const results = await database.collection("publishedQ").aggregate([
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

            console.log(query)

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
        let query={name:name}

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


    //get a summary of Q by url for the selection display. No items
    //get the most recent version of all adHoc Q


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
        if (! url || ! version) {
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