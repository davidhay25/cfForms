//For server side library functions like backup


const axios = require("axios");


//let serverBase = "http://test.canshare.co.nz:8080/fhir/"


async function setup(app,client) {


    //save a bundle in the library so BV can access it
    app.put("/saveBundle/:id",async function (req,res){
        let bundle = req.body
        let id = req.params.id;
        if (bundle) {
            delete bundle['_id']
            //console.log(bundle)

            let db = client.db('clinfhir')      //bundles need to be saved into the clinfhir database

            let query = {id:id}
            const update = { $set: bundle }
            try {
                await db.collection("bvBundles").updateOne(query,update,{upsert:true})
                res.json()

            } catch(ex) {
                console.log(ex)
                res.status(500).json(ex.message)
            }
        }

    })

    //backup from test to local.
    app.post('/library/backupTestToLocal',async function(req,res) {
        const source = "http://test.canshare.co.nz"
        const target = "http://localhost:9500"
        try {
            await performCopy(source,target)
            res.json()
        } catch (ex) {
            res.status(500).json({msg:ex.msg})
        }

    })

    //backup from prod to test via API
    app.post('/library/backupProdToTest',async function(req,res) {

        const source = "http://poc.canshare.co.nz"
        const target = "http://test.canshare.co.nz"

        try {
            await performCopy(source,target)
            res.json()
        } catch (ex) {
            res.status(500).json({msg:ex.msg})
        }


    })



    //perform the actual backup
    async function performCopy(source,target) {
        //-------------  datagroups
        console.log(source,target);

        //return

        let qry = `${source}/model/allDG`
        let response = await axios.get(qry)

        let allDg = response.data
        let config = {headers:{'x-user-email': 'uploadscript.dummy.com'}}

        for (const dg of allDg) {
            let updateQry = `${target}/model/DG/${dg.name}`
            //errors bubble up to caller
            await axios.put(updateQry,dg,config)
        }


        //compositions
        let qryComp = `${source}/model/allCompositions`

        let responseComp = await axios.get(qryComp)

        let allCompositions = responseComp.data //JSON.parse(response.data)
        //let config = {headers:{'x-user-email': 'uploadscript.dummy.com'}}

        for (const comp of allCompositions) {
            let updateQry = `${target}/model/comp/${comp.name}`
            //errors bubble up to caller
            await axios.put(updateQry,comp,config)
        }
    }



}


module.exports = {
    setup : setup
};