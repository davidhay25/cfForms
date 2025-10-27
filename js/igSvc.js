//Utilities related to IG generation
angular.module("pocApp")

    .service('igSvc', function(modelsSvc,utilsSvc,$filter) {


        function makeSafeString(s) {
            if (s) {
                s = s.replace(/"/g, "'");
                return s
            } else {
                return ""
            }

        }

        return {


            findResourceType(dg,hashAllDG) {
                //find the resource type to profile the DG by stepping up the hierarchy

                if (! dg) {
                    return
                }

                if (! hashAllDG) {
                    alert('igSvc.findResourceType - hashAllDG is null. weird.')
                    return
                }

                if (dg.type) {
                    return dg.type
                }

                let dgName = dg.name
                let tmpDG = dg

                let ctr = 0

                while (tmpDG.parent) {
                    let parent = tmpDG.parent
                    let dgTitle = tmpDG.title
                    tmpDG = hashAllDG[tmpDG.parent]
                    if (! tmpDG) {
                        alert(`DG ${parent} was not found. Referenced in ${dgTitle}`)
                        return
                    }

                    if (tmpDG.type) {
                        return tmpDG.type
                    }

                    ctr++
                    if (ctr > 100) {
                        alert(`Error finding ultimate parent of ${dgName} - recursion issue most likely`)
                        return
                    }

                }

                return


            },

            makeProfileFshComp : function (comp,hashAllDg) {
                let arFsh = []
                let compName = comp.name.replace(/ /g,"")
                arFsh.push(`Profile:\t\t${compName}_profile`)
                arFsh.push(`Parent:\t\tComposition`)
                arFsh.push(`Id:\t\t\t${compName}-id`)
                arFsh.push(`Title:\t\t\t"${comp.title}"`)
                if (comp.description) {
                    arFsh.push(`Description:\t"${comp.description}"`)
                }
                arFsh.push(`\n`)

                arFsh.push(`* section ^slicing.discriminator.type = #pattern`)
                arFsh.push(`* section ^slicing.discriminator.path = "code"`)
                arFsh.push(`* section ^slicing.rules = #open`)
                arFsh.push(`\n`)
                arFsh.push(`* section.entry ^slicing.discriminator.type = #profile`)
                arFsh.push(`* section.entry ^slicing.discriminator.path = "resolve()"`)
                arFsh.push(`* section.entry ^slicing.rules = #open`)

                let ar = []     //for the details of the section
                arFsh.push(`* section contains`)
                comp.sections.forEach(function (section) {
                    arFsh.push(`\t${section.name} ${section.mult} and`)

                    //the definitions of each section - ie the profile.
                    //todo - this won't be ok as the sectionDG doesn't have a profile itself (ATM) - it has no base type
                    //todo - do we need to create a profile for the sectionDG that just includes the types it uses?
                    ar.push(`\n`)
                    ar.push(`* section[${section.name}].code = http://dummy.org#${section.name}`)
                    if (section.items && section.items.length > 0) {
                        let cUrl = section.items[0].type[0]
                        ar.push(`* section[${section.name}].entry = Reference(${cUrl})`)
                    }


                })
                arFsh[arFsh.length-1] = arFsh[arFsh.length-1].slice(0,-3)   //remove the trailing and

                //now add the section definitions
                arFsh = arFsh.concat(ar)

                let fsh = arFsh.join('\n')

                return {fsh:fsh}
            },


            makeProfileFshDg : function (dg,fullElementList) {
                //updated profile creater.
                //todo - better support for extensions (ie define them in the model)
                let extensionUrlRoot = "http://canshare.co.nz/StructureDefinition"
                let valueSetUrlRoot = "https://nzhts.digital.health.nz/fhir/ValueSet"
                let arFsh = []
                let logEd = []    //log of Eds that had fsh related content. Not all entries will...
                let errors = []     //errors encountered during generation
                let manifest = {extensions:{}}   //contains the structures created - currently only extensions
                let hashExtensions = {} //hash of extensions by path
                arFsh.push(`Profile:\t${dg.name}_profile`)
                arFsh.push(`Parent:\t\t${dg.name}`)
                arFsh.push(`Id:\t\t${dg.name}-id`)
                arFsh.push(`Title:\t\t"${makeSafeString(dg.title)}"`)
                if (dg.description) {
                    arFsh.push(`Description:\t"${makeSafeString(dg.description)}"`)
                }
                arFsh.push(`\n`)

                //iterate over all the elements in the DG looking for profiling instructions

                fullElementList.forEach(function (item) {
                    let ed = item.ed

                    //extraction context


                    //extraction expression


                    //fixed value

                    //valueSet (on any element)
                    if (ed.valueSet) {

                    }






                })


                arFsh.push(`\n`)

                return arFsh.join('\n')

/*
                //now define all the extensions and add them to the fsh array
                let arExtensions = []       //have extensions in a separate array so they can go at the bottom of the list
                let hashExtensionUrl = {}       //don't re-define extensions (todo what to do if the same ext url is used in different profiles)
                //todo - should extensions be in a separate, shared storage
                Object.keys(hashExtensions).forEach(function (key) {
                    //key is the root where it is applied in this profile
                    let items = hashExtensions[key]

                    //item is [{url: type:}]
                    for (const item of items) {
                        let url = item.url
                        let type = item.type
                        let ed = item.ed
                        let internalName = $filter('lastInPath')(ed.path)
                        if (! hashExtensionUrl[url]) {      //so each url has only a single definition
                            //place the definition of extension in the hash. We're also putting it in the
                            //profile 'file' - this is  redundant and we can likely remove later...
                            hashExtensionUrl[url] = []

                            hashExtensionUrl[url].push(`Extension:\t\t${internalName}_ext`)
                            hashExtensionUrl[url].push(`Id:\t\t\t\t${internalName}-id`)
                            hashExtensionUrl[url].push(`Title:\t\t\t"${internalName}"`)
                            if (ed.description) {
                                hashExtensionUrl[url].push(`Description:\t"${makeSafeString(ed.description)}"`)
                            }
                            hashExtensionUrl[url].push(`* ^url = "${url}"`)
                            hashExtensionUrl[url].push(`* value[x] only ${type}`)

                            if (item.valueSet) {
                                let vsUrl = item.valueSet

                                if (vsUrl.indexOf('http') == -1) {
                                    vsUrl = `${valueSetUrlRoot}/${vsUrl}`
                                }

                                hashExtensionUrl[url].push(`* value[x] from ${vsUrl} (preferred)`)
                            }

                            //add the extension definition to the arExtensions array.

                            arExtensions = arExtensions.concat(hashExtensionUrl[url])
                            arExtensions.push('\n')
                        }
                    }
                })

                //add all the extension references to the elements in the profile
                Object.keys(hashExtensions).forEach(function (key) {
                    //key is the root where it is applied in this profile
                    let items = hashExtensions[key]     //represents

                    let prefix = ""
                    if (key !== 'root') {
                        prefix = `${key}.`
                    }

                    //item is [{url: type: valueSet: name:}]
                    let arLne = [`* ${prefix}extension contains `]
                    for (const item of items) {
                        //arFsh.push(`extension contain`)
                        arLne.push(`\t${item.url} named ${item.name} ${item.ed.mult} and`)
                    }

                    arLne[arLne.length-1] = arLne[arLne.length-1].slice(0,-3)

                    arFsh = arFsh.concat(arLne)
                    arFsh.push('\n')
                })


                //now concatenate the extension definitions to the fsh array

                arExtensions.splice(0,0,"\n//---extensions---- Any updates to extensions will not be saved---------\n")
                arFsh = arFsh.concat(arExtensions)

*/


                function addSingleElement(ed) {
                    //add a single element. todo: add support for bindings, fixed values etc.
                    //called when there is a FHIRPath entry, but no extension, fsh or 'is reference' set

                    let path = $filter('dropFirstInPath')(ed.profile.fhirPath)

                    //the default line
                    let lne = `* ${path} ${ed.mult}`

                    if (ed.valueSet) {
                        lne = `* ${path} from ${ed.valueSet} (preferred)`
                    }

                    //shouldn't have both a default and a fixed value
                    if (ed.defaultCoding) {
                        lne = `* ${path} ^defaultValueCodeableConcept = ${ed.defaultCoding.system}#${ed.defaultCoding.code}  //default value`
                    }

                    if (ed.fixedCoding) {
                        lne = `* ${path} = ${ed.fixedCoding.system}#${ed.fixedCoding.code}  //fixed value`
                    }

                    if (ed.fixedCode) {
                        lne = `* ${path} = #${ed.fixedCode} //fixed value`
                    }

                    arFsh.push(lne)

                    // code ^defaultValueCodeableConcept = http://mysystem#cd

                    logEd.push({ed:ed,reason:'Single element',content:[lne]})

                }

                function addReference(ed) {
                    //add a reference to the arFsh
                    let type = ed.type[0]   //todo the naming needs further thought
                    //let path = ed.path
                    if (ed.profile.fhirPath) {
                        let path = $filter('dropFirstInPath')(ed.profile.fhirPath)
                        arFsh.push(`* ${path} = Reference(${type}-id)`)
                    } else {
                        errors.push({ed:ed,issue:'fhirPath is missing',content:[]})
                    }

                    logEd.push({ed:ed,reason:'Reference to other resource',content:[type]})

                }

                function addExtension(ed) {
                    //add an extension to the hashExtensions
                    //this routine is only called if ed.profile.extUrl exists so don't need to check
                    //all extensions are added to hashExtensions = keyed by path and added to the profile at the end
                    //let summary = {}       //a summary of the extension, to be added to the manifest
                    let type = ed.type[0]
                    let localName = $filter('lastInPath')(ed.path)
                    if (type == "group") {
                        //a group will be a complex extension
                        //todo - need to think about slicing where the contents will be references to other DGs
                    } else {
                        //this is a simple, single extension
                        let extUrl = ed.profile.extUrl
                        if (extUrl.indexOf('http') == -1) {
                            //this is a new extension that needs to be defined by canshare
                            extUrl = `${extensionUrlRoot}/${extUrl}`
                        }


                        //determine where the extension is located. This is defined in the fhirpath

                        let base = 'root'
                        if (ed.profile.fhirPath) {
                            //need to remove the first part of the fhirpath (the resource type)
                            let ar = ed.profile.fhirPath.split('.')
                            if (ar.length == 1) {
                                errors.push({ed:ed,issue:'fhirPath is missing resource type',content:[ed.profile.fhirPath]})
                            } else {
                                ar.splice(0,1)
                                base = ar.join('.')
                            }
                        }



                        hashExtensions[base] = hashExtensions[base] || []

                        let vo = {name:localName,ed:ed,url:extUrl,type:ed.type[0]}
                        if (ed.valueSet) {
                            vo.valueSet = ed.valueSet
                        }

                        hashExtensions[base].push(vo)

                        logEd.push({ed:ed,reason:'Single extension',content:[extUrl]})

                        return {name:localName,type:vo.type}       //this acts as a summary of the extension

                    }

                }



            },



            makeFshForComp : function(comp,elements,hashElements) {
                let that = this
                //generate a fsh file for a composition logical model.
                //the sections will be the top level entries. We use the composition to structure the model by
                //iterating over the sections, then the contents of the sections.
                //but because the composition can override the DG's, we need to iterate using the values in hashElements

               // console.log(elements)

                //elements is an array of {item:ed}
                //paths have structure {comp name}.{section}.{dg details}
                //pull out each DG from the section (where the 3rd segment is the same) and use the DG generation

                let currentDG = []  //the dg currently being examined
                let arCompFsh = []  //the fsh for each DG within each section - as well as the Comp header

                //let arLines = []
                let compName = comp.name.replace(/ /g,"")



                arCompFsh.push(`Logical:\t ${compName}`)
                arCompFsh.push(`Id:\t\t ${compName}`)
                arCompFsh.push(`Title:\t\t "${comp.title}"`)
                if (comp.description) {
                    arCompFsh.push(`Description:\t "${comp.description}"`)
                }
                arCompFsh.push("")
                arCompFsh.push(`* ^identifier.system = "http://canshare.co.nz/ns/lmComp"`)
                arCompFsh.push(`* ^identifier.value = "${compName}"`)

                let initialSpacer = "  "  //all the lines generated by the DG need to be inset

                elements.forEach(function (item) {
                    let ed = item.ed
                    let path = ed.path
                    let ar = path.split('.')
                    let clone = angular.copy(item)      //as we'll be updating the path...

                    switch (ar.length) {
                        case 1:
                            //the first line of the comp
                            break
                        case 2:
                            //this is a section NZName 0..1 BackboneElement "A person’s name details"

                            //Write out the FSH for the previously current DG
                            if (currentDG.length > 0) {
                                //all of the elements in the previous DG have been added to currentDG. Generate the FSH
                                let fsh = that.makeFshForDG(comp,currentDG,true,initialSpacer)
                                arCompFsh.push(fsh)
                                arCompFsh.push('')
                                currentDG.length = 0
                            }

                            let lne = `* ${ed.name} ${ed.mult} BackboneElement "${ed.title}"`
                            arCompFsh.push(lne)
                            //arCompFsh.push("")
                            break
                        case 3:
                            //this is the contents of the DG. They have been expanded prior to calling this function

                            //let clone = angular.copy(item)
                            clone.ed.path = adjustPath(clone.ed.path)
                            currentDG.push(clone)

                            break
                        default:
                            //contents of the DG (and any z elements). Add to the current array
                            clone.ed.path = adjustPath(item.ed.path)  //remove the first 2 segments from the path
                            currentDG.push(item)
                    }



                })
                //add the last DG
                let fsh = that.makeFshForDG(comp,currentDG,true,initialSpacer)
                arCompFsh.push(fsh)


                return arCompFsh.join('\n')

                function adjustPath(path) {
                    let ar = path.split('.')
                    ar.splice(0,2)
                    return ar.join('.')
                }



            },
            makeFshForDG : function (dg,elements,hideHeader,initialSpacer) {
                //generate a FSH file (Logical Model)for a given DG
                //elements is the complete list of elements, including those derived from parents and
                //with child values updated from parents (if any)
                //if hideHeader is true then don't generate the LM header - this is being used by the composition generation

                initialSpacer = initialSpacer || ""     //when used by the comp.

                let fhirDT = utilsSvc.fhirDataTypes()
                let pathsToHide = []

                //remove all elements that have a mult of 0..0 or a parent
                let cleanedElements = []
                elements.forEach(function (item,inx) {
                    let ed = item.ed
                    if (ed) {
                        let canAdd = true
                        if (ed.mult == '0..0') {
                            pathsToHide.push(ed.path)
                            canAdd = false
                        } else {
                            //is this a descendent of a hidden element
                            let path = ed.path
                            for (const p of pathsToHide) {
                                if (path.isChildPath(p)) {
                                    //if (path.startsWith(p)) {
                                    canAdd = false
                                    break
                                }
                            }
                        }
                        if (canAdd) {
                            cleanedElements.push(item)
                        }
                    }


                })



                //now construct an object that represents the hierarchy (rather than a flat list of elements).
                let hash = {}
                let rootPath
                cleanedElements.forEach(function (item,inx) {
                    let ed = item.ed
                    let path = ed.path
                    hash[path] = {ed:ed,children:[]}  //add to the hash in case it is a parent...

                    //add the ed to the parent
                    let ar = ed.path.split('.')
                    if (ar.length > 1) {
                        ar.pop()
                        let parentPath = ar.join('.')
                        if (hash[parentPath] && hash[parentPath].children) {
                            hash[parentPath].children.push(hash[path])
                        }

                    } else {
                        rootPath = ar[0]
                    }

                })



               // now we can build the FSH document

                let arLines = []

                if (! hideHeader) {
                    //ensure the first letter is capitalized
                    //add '_cs' to the end of the lm so that it isn't the same as a FHIR resource type. Causes issues with the IG!
                    let dgName = dg.name.charAt(0).toUpperCase() + dg.name.slice(1)
                    arLines.push(`Logical:\t ${dgName}_cs`)
                    arLines.push(`Id:\t\t ${dgName}-cs`)
                    arLines.push(`Title:\t\t "${makeSafeString(dg.title)}"`)
                    if (dg.description) {
                        arLines.push(`Description:\t "${makeSafeString(dg.description)}"`)
                    }
                    arLines.push("")
                }

                //the recursive processing function
                function processNode(ar,node,spacer) {
                    //ar.push(node.ed.path)
                    let arFshLine = getFsh(node.ed)     //will be an array of lines
                    arFshLine.forEach(function (lne) {
                        ar.push(spacer + lne)
                    })

                    if (node.children) {
                        //the first element (the root) has no fshLine. Checking here avoids over indenting
                        if (arFshLine.length > 0) {
                            spacer += "  "
                        }

                        node.children.forEach(function (child) {
                            processNode(ar,child,spacer)
                        })
                    }
                }

                if (hash[rootPath]) {
                    processNode(arLines,hash[rootPath],initialSpacer)
                }


                return arLines.join('\n')

                //get the fsh lines for an ed
                //can be more than one
                function getFsh(ed) {


                    if (ed.type) {
                        let arLne = []

                        let lne = ""
                        let type = ed.type[0]
                        //if the type is not a FHIR type, then it will be one of the DG. Replace it with 'BackboneElement'
                        if (fhirDT.indexOf(type) == -1 || type == 'Group') {
                            type = "BackboneElement"
                        }

                        //this segment uses the path as the first word - useful for our models
                        //let ar =  ed.path.split('.')
                        //let name = ar[ar.length-1].replace(/slice:/g, '')

                        //change to title
                        let title = ed.title || ed.path
                        title = title.trim()
                        let name = title.replace(/ /g,'_')


/*
                        //this segment uses the title - better for iccr
                        let name = ed.title.trim()
                        name = name.replace(/ /g,'_')
                        name = name.replace(/\./g, "_")
                        name = name.replace(/\(/g, "_")
                        name = name.replace(/\)/g, "_")
                        name = name.replace(/\,/g, "_")
                        name = name.replace(/\//g, "_")

*/

                        lne = `* ${name}`
                        let mult = ed.mult || '0..1'
                        lne += ` ${mult} ${type} `

                        let description = ed.description || ed.title || ed.path
                        lne += `"${cleanString(description)}"`

                        arLne.push(lne)
                        if (ed.valueSet) {
                            let vs = ed.valueSet.replace(/\s/g, '') //remove any spaces
                            //let lneVs =`* ${ar[ar.length-1]} from https://nzhts.digital.health.nz/fhir/ValueSet/${vs} (preferred)`
                            let lneVs =`* ${name} from https://nzhts.digital.health.nz/fhir/ValueSet/${vs} (preferred)`
                            arLne.push(lneVs)
                        }

                        return arLne
                    } else {
                        return []
                    }

                }

                function cleanString(s) {
                    if (s) {
                        s = s.replace(/"/g, "'");
                        return s
                    } else {
                        return ""
                    }


                }



            },
            makeDocumentProfile : function (comp) {
                //generate a
            }

        }
    })