angular.module("pocApp").service('exportSvc', function() {


        return {


            makeDGSimpleExport: function (hashAllDG) {
                //make an export TSV file that can be used for the spreadsheet import - ie a subset of the DG data
                //use the json export for a complete one
                let ar = []

                ar.push("DG Name\tDG Parent\tDG title\tDG description\tElement Name\tElement title\tElement type\tElement Description\tCardinality\tValueSet\tNotes\tConcept code\r\n")
                ar.push("\r\n")
                for (const key of Object.keys(hashAllDG)) {
                    //a line for the DG
                    let dg = hashAllDG[key]
                    let lne = dg.name + "\t"
                    if (dg.parent) {
                        lne += dg.parent + "\t"
                    } else {
                        lne += "\t"
                    }
                    lne += getValue(dg.title) + "\t"
                    lne += "\r\n"
                    ar.push(lne)
                    //a line for each entry in the diff
                    for (const ed of dg.diff) {
                        let lne = "\t\t\t\t"        //spacers
                        lne += ed.path + "\t"
                        lne += getValue(ed.title) + "\t"
                        lne += ed.type[0] + "\t"
                        lne += getValue(ed.description) + "\t"
                        lne += ed.mult + "\t"
                        lne += getValue(ed.valueSet) + "\t"
                        lne += getValue(ed.notes) + "\t"
                        if (ed.itemCode) {
                            let s = getValue(ed.itemCode.code) + " | " + getValue(ed.itemCode.display) + " | " + getValue(ed.itemCode.system)
                            lne += s + "\t"
                        } else {
                            lne += "\t"
                        }
                        lne += "\r\n"
                        ar.push(lne)


                    }


                }

                let result = ar.toString()
                result = result.replace(/\,/g, "")  //no idea why it's inserting commas...
                return result


                function getValue(s){
                    if (s) {
                        return s
                    } else {
                        return""
                    }

                }

            }
        }
    }
)