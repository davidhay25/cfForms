angular.module("pocApp")

    .service('documentSvc', function($filter,utilsSvc) {

        let config= {}

        return {

            makeHISODocument: function (fullElementList,dg) {
                //generate a HISO summary from an expanded DG. Adapted from the one for compositions
                //

                let fhirDT = utilsSvc.fhirDataTypes()
                let arDoc = []

                //create a hash of ed by path
                let hashEd = {}
                fullElementList.forEach(function (item) {
                    let ed = item.ed
                    hashEd[ed.path] = ed
                })

                //-------- element details



                arDoc.push(addTaggedLine("h1", dg.title))

                if (dg.description) {
                    arDoc.push(addTaggedLine("p", dg.description))
                }


                arDoc.push(addTaggedLine("h2", "Data elements"))

                fullElementList.forEach(function (item) {
                    let ed = item.ed

                    if (ed.type) {
                        let type = ed.type[0]

                        if (fhirDT.indexOf(type) == -1) {
                            //this is a group or a DataType
                            //arDoc.push(`<a name="${hashLink[ed.path]}"></a>`)

                            arDoc.push(addTaggedLine("h2", ed.title));


                        } else {
                            //arDoc.push(addTaggedLine("h2", $filter('lastInPath')(ed.path)));
                            //arDoc.push(`<a name="${hashLink[ed.path]}"></a>`)
                            arDoc.push(addTaggedLine("h3", ed.title));

                            arDoc.push("<table class='dTable'>");

                            addRowIfNotEmpty(arDoc, 'Description', ed.description)

                            addRowIfNotEmpty(arDoc, 'Source standards', ed.sourceReference)


                            if (ed.valueSet) {
                                let vs = ed.valueSet
                                if (vs.indexOf('http') == -1) {
                                    vs = 'https://nzhts.digital.health.nz/fhir/ValueSet/'+vs
                                }

                                addRowIfNotEmpty(arDoc, 'Value domain', vs)

                            }

                            if (ed.fixedCoding) {
                                let disp = `${ed.fixedCoding.code} | ${ed.fixedCoding.display} | ${ed.fixedCoding.system}`
                                addRowIfNotEmpty(arDoc, 'Fixed code', disp)
                            }

                            if (ed.options) {
                                let ar = []
                                for (const concept of ed.options) {
                                    let lne =`${concept.code}|${concept.display}|${concept.system}`
                                    ar.push(lne)
                                }
                                let text = ar.join('\n')
                                addRowIfNotEmpty(arDoc, 'Value domain', text)
                            }

                            addRowIfNotEmpty(arDoc, 'Data type', type)

                            let stuff = getHisoDefaults(type)

                            addRowIfNotEmpty(arDoc, 'Layout', stuff.hisoLayout)  //<<<todo

                            if (ed.units && ed.units.length > 0) {
                                addRowIfNotEmpty(arDoc, 'Unit of measure', ed.units.join(" "))
                            }

                            if (ed.itemCode) {
                                let itemCode = `${ed.itemCode.code}|${ed.itemCode.display}|${ed.itemCode.system} `
                                addRowIfNotEmpty(arDoc, 'Observable entity', itemCode)
                            }

                            let occurence = "Optional, "
                            if (ed.mult) {
                                if (ed.mult.indexOf('1.') > -1) {
                                    occurence = "Required, "
                                }
                                if (ed.mult.indexOf('*') > -1) {
                                    occurence += "multiple occurrences"
                                } else {
                                    occurence += "single occurrence"
                                }
                                addRowIfNotEmpty(arDoc, 'Cardinality', occurence)
                            }


                            let cond = []   //conditionaity
                            if (ed.enableWhen && ed.enableWhen.length > 0) {
                                for (const ew of ed.enableWhen) {
                                    let sourceEd = hashEd[ew.source]
                                    if (sourceEd) {
                                        let value = ew.value
                                        if (value.code) {
                                            value = `${value.code}|${value.display}|${value.system}`
                                        }

                                        let lne = `Enable when ${sourceEd.title} ${ew.operator} ${value}`
                                        cond.push(lne)
                                    }
                                }
                            }
                            if (ed.notes) {
                                cond.push(ed.notes)
                            }
                            addRowIfNotEmpty(arDoc, 'Guide for use', cond.join('\n'))

                            addRowIfNotEmpty(arDoc, 'Rules',ed.rules)



                            arDoc.push("</table><br/>");

                            //arDoc.push(`<td><a href="#${hashLink[ed.path]}-src">Back</a></td>`)
                           // arDoc.push(`<div style="text-align: right;"><a class="tocFont" href="#${hashLink[ed.path]}-src">Back to TOC</a></div>`)
                        }
                    }
                })


                const header = `   
                    <html><head>
                    <style>
                    
                        h1, h2, h3, h4 {
                         font-family: Arial, Helvetica, sans-serif;
                        }
                    
                        tr, td {
                            border: 1px solid black;
                            padding : 8px;
                        }
                    
                        .dTable {
                            font-family: Arial, Helvetica, sans-serif;
                            width:100%;
                            border: 1px solid black;
                            border-collapse: collapse;
                        }
                        
                        .col1 {
                            background-color:Gainsboro;
                        }
                        
                        .tocFont {
                            font-family: Calibri, sans-serif;
                        }
                                   
                    </style>
                    </head>
                    <body style="padding: 8px;">
                    
                `;

                const footer = "</body></html>"


                let html = header + arDoc.join("\n") + footer;

                return html



                function getHisoDefaults(dt) {
                    //return the HISO defaults for a given Q datatype
                    let meta = {}

                    switch (dt) {
                        case "string" :
                            meta.hisoDT = "String"
                            meta.hisoLength = 100
                            meta.hisoLayout = "X(100)"
                            break

                        case "text" :
                            meta.hisoDT = "String"
                            meta.hisoLength = 1000
                            meta.hisoLayout = "X(1000)"

                            break

                        case "integer" :
                            meta.hisoDT = "Integer"
                            meta.hisoLength = 3
                            meta.hisoLayout = "N(3)"

                            break

                        case "decimal" :
                            meta.hisoDT = "Decimal"
                            meta.hisoLength = 8
                            meta.hisoLayout = "N(8)"
                            break

                        case "boolean" :
                            meta.hisoDT = "Boolean"
                            meta.hisoLength = 1
                            meta.hisoLayout = "X(1)"

                            break

                        case "date" :
                            meta.hisoDT = "Date"
                            meta.hisoLength = 8
                            meta.hisoLayout = "CCYY[MM[DD]]"
                            meta.hisoClass = "full date"
                            break

                        case "dateTime" :
                            meta.hisoDT = "Date/time"
                            meta.hisoLength = 18
                            meta.hisoLayout = "YYYYMMDD:[HH:MM]"
                            break

                        case "date":
                            meta.hisoDT = "Date"
                            meta.hisoLength = 12
                            meta.hisoLayout = "YYYY[MM[DD]]"

                            break
                        case "choice" :
                        case "open-choice" :
                            meta.hisoLength = 18
                            meta.hisoDT = "String"
                            meta.hisoLayout = "X(18)"

                            break
                    }
                    return meta

                }




                function addRowIfNotEmpty(ar,description,data) {
                    if (data) {


                        let display = data;

                        let arData =  data.split('\n')
                        if (arData.length > 1)  {
                            display = ""
                            arData.forEach(function (lne) {
                                display += "<div>" + lne + "</div><br/>"
                            })
                        }


                        ar.push('<tr>');
                        ar.push('<td valign="top" width="20%" class="col1">' + description + "</td>");

                        if (data && data.toLowerCase() == 'no description') {
                            ar.push('<td></td>');
                        } else {
                            ar.push('<td>' + display + "</td>");
                        }


                        ar.push('</tr>');
                    }
                }

                function addTaggedLine(tag,data) {

                    if (data && data.toLowerCase() == 'no description') {
                        return "<"+tag + "></"+tag+">"
                    } else {
                        return "<"+tag + ">"+data+"</"+tag+">"
                    }




                }

            }
        }})