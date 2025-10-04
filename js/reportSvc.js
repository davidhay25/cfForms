angular.module("pocApp").service('reportSvc', function() {


    let service = {
        "checkIds" : function (hashAllDG) {
            //check that ids are unique across all elements in the DGs
            let hashId = {}

            for (const key of Object.keys(hashAllDG)) {
                let dg = hashAllDG[key]
                let id = dg.id
                hashId[id] = hashId[id] || []
                hashId[id].push(dg.name)
                if (dg.diff) {
                    for (const ed of dg.diff) {
                        let id = ed.id
                        hashId[id] = hashId[id] || []
                        hashId[id].push(`${dg.name}.${ed.path}`)
                    }
                }

            }

            let dups = []
            for (const id of Object.keys(hashId)) {
                let cnt = hashId[id].length
                if (cnt > 1) {
                    dups.push({id:id,paths:hashId[id]})
                }
            }

            return dups


        }

    }

    return service

})