function globalCache(){
    this.accountInfo=null;
    this.joinedProjectsToken=null;
    this.showFloatInfoPanel=true
    this.DBModelsArr = []
    this.DBTwins = {}
    this.modelIDMapToName={}
    this.modelNameMapToID={}
    this.twinIDMapToDisplayName={}
    this.twinDisplayNameMapToID={}
    this.storedTwins = {}
    this.layoutJSON={}
    this.visualDefinition={"default":{"detail":{}}}
    this.symbolLibs={}

    this.clipboardNodeStyle=null

    this.initStoredInformtion()
}

globalCache.prototype.checkTooLongIdle = function () {
    var previousTime=new Date().getTime()
    var maxDiff=10*60*1000

    var previousMouseDown=new Date().getTime()
    $(document).ready( ()=> {
        $(document).mousedown( (e)=> {
            previousMouseDown=new Date().getTime()
        });
    })

    setInterval(()=>{
        var currentTime=new Date().getTime()
        var diff1=currentTime-previousTime
        var diff2=currentTime-previousMouseDown
        if(diff1>maxDiff || diff2>maxDiff){
            //log out as it means the page just resumed from long time computer sleep
            this.stallPage()
        }
        previousTime=currentTime
    },60000)
}

globalCache.prototype.stallPage=function(){
    $('body').empty()
    for(var ind in global){
        if(ind=="location") continue
        try{
            global[ind]=null
        }catch(e){
            console.log(e)
        }
    } 

    const url = new URL(window.location.href);
    var destURL= url.origin+"/spaindex.html"
    window.location.replace(destURL);
}

globalCache.prototype.initStoredInformtion = function () {
    this.storedOutboundRelationships = {} 
    //stored data, seperately from ADT service and from cosmosDB service
    this.currentLayoutName=null   
}

globalCache.prototype.findProjectInfo=function(projectID){
    var joinedProjects=this.accountInfo.joinedProjects
    for(var i=0;i<joinedProjects.length;i++){
        var oneProject=joinedProjects[i]
        if(oneProject.id==projectID) return oneProject
    }
}


globalCache.prototype.storeADTTwins=function(twinsData){
    twinsData.forEach((oneNode)=>{this.storeSingleADTTwin(oneNode)});
}

globalCache.prototype.storeSingleADTTwin=function(oneNode){
    this.storedTwins[oneNode["$dtId"]] = oneNode
    oneNode["displayName"]= this.twinIDMapToDisplayName[oneNode["$dtId"]]
    //this.broadcastMessage({ "message": "ADTTwinInfoUpdate","twinID":oneNode["$dtId"]})
}


globalCache.prototype.storeSingleDBTwin=function(DBTwin){
    var originalDBTwin=this.DBTwins[DBTwin["id"]]
    if(!originalDBTwin){
        originalDBTwin={}
        this.DBTwins[DBTwin["id"]]=originalDBTwin
    }
    for(var ind in originalDBTwin) delete originalDBTwin[ind]
    for(var ind in DBTwin) originalDBTwin[ind]=DBTwin[ind]

    this.twinIDMapToDisplayName[DBTwin["id"]]=DBTwin["displayName"]
    this.twinDisplayNameMapToID[DBTwin["displayName"]]=DBTwin["id"]
}

globalCache.prototype.storeDBTwinsArr=function(DBTwinsArr){
    for(var ind in this.DBTwins) delete this.DBTwins[ind]
    for(var ind in this.twinIDMapToDisplayName) delete this.twinIDMapToDisplayName[ind]
    for(var ind in this.twinDisplayNameMapToID) delete this.twinDisplayNameMapToID[ind]

    this.mergeDBTwinsArr(DBTwinsArr)
}

globalCache.prototype.mergeDBTwinsArr=function(DBTwinsArr){
    DBTwinsArr.forEach(oneDBTwin=>{
        this.DBTwins[oneDBTwin["id"]]=oneDBTwin
        this.twinIDMapToDisplayName[oneDBTwin["id"]]=oneDBTwin["displayName"]
        this.twinDisplayNameMapToID[oneDBTwin["displayName"]]=oneDBTwin["id"]
    })
}

globalCache.prototype.storeUserData=function(res){
    res.forEach(oneResponse=>{
        if(oneResponse.type=="joinedProjectsToken") this.joinedProjectsToken=oneResponse.jwt;
        else if(oneResponse.type=="user") this.accountInfo=oneResponse
    })
}

globalCache.prototype.storeProjectModelsData=function(DBModels,adtModels){
    this.storeDBModelsArr(DBModels)

    for(var ind in this.modelIDMapToName) delete this.modelIDMapToName[ind]
    for(var ind in this.modelNameMapToID) delete this.modelNameMapToID[ind]

    var tmpNameToObj = {}
    for (var i = 0; i < adtModels.length; i++) {
        if (adtModels[i]["displayName"] == null) adtModels[i]["displayName"] = adtModels[i]["@id"]
        if ($.isPlainObject(adtModels[i]["displayName"])) {
            if (adtModels[i]["displayName"]["en"]) adtModels[i]["displayName"] = adtModels[i]["displayName"]["en"]
            else adtModels[i]["displayName"] = JSON.stringify(adtModels[i]["displayName"])
        }
        if (tmpNameToObj[adtModels[i]["displayName"]] != null) {
            //repeated model display name
            adtModels[i]["displayName"] = adtModels[i]["@id"]
        }
        tmpNameToObj[adtModels[i]["displayName"]] = 1

        this.modelIDMapToName[adtModels[i]["@id"]] = adtModels[i]["displayName"]
        this.modelNameMapToID[adtModels[i]["displayName"]] = adtModels[i]["@id"]
    }
}

globalCache.prototype.storeProjectTwinsAndVisualData=function(resArr){
    var dbtwins=[]
    for(var ind in this.visualDefinition) delete this.visualDefinition[ind]
    for(var ind in this.layoutJSON) delete this.layoutJSON[ind]
    this.visualDefinition["default"]={"detail":{}}

    resArr.forEach(element => {
        if(element.type=="visualSchema") {
            //TODO: now there is only one "default" schema to use,consider allow creating more user define visual schema
            //TODO: only choose the schema belongs to self
            this.recordSingleVisualSchema(element.detail,element.accountID,element.name,element.isShared)
        }else if(element.type=="Topology") {
            this.recordSingleLayout(element.detail,element.accountID,element.name,element.isShared)
        }else if(element.type=="DTTwin") dbtwins.push(element)
        else if(element.type=="symbols"){
            this.symbolLibs[element.displayName]=element.detail
        }
    });
    this.storeDBTwinsArr(dbtwins)

    resArr.forEach(element => {
        if(element.originalScript!=null) { 
            var twinID=element.twinID
            var oneDBTwin=this.DBTwins[twinID]
            if(oneDBTwin){
                oneDBTwin["originalScript"]=element["originalScript"]
                oneDBTwin["lastExecutionTime"]=element["lastExecutionTime"]
                oneDBTwin["author"]=element["author"]
                oneDBTwin["invalidFlag"]=element["invalidFlag"]
                oneDBTwin["inputs"]=element["inputs"]
                oneDBTwin["outputs"]=element["outputs"]

            }
        }
    });
}

globalCache.prototype.recordSingleVisualSchema=function(detail,accountID,oname,isShared){
    if (accountID == this.accountInfo.id) var vsName = oname
    else vsName = oname + `(from ${accountID})`
    var dict = { "detail": detail, "isShared": isShared, "owner": accountID, "oname": oname}
    this.visualDefinition[vsName]=dict
}

globalCache.prototype.recordSingleLayout=function(detail,accountID,oname,isShared){
    if (accountID == this.accountInfo.id) var layoutName = oname
    else layoutName = oname + `(from ${accountID})`
    var dict = { "detail": detail, "isShared": isShared, "owner": accountID, "name": layoutName, "oname":oname }
    this.layoutJSON[layoutName] = dict
}

globalCache.prototype.getDBTwinsByModelID=function(modelID){
    var resultArr=[]
    for(var ind in this.DBTwins){
        var ele=this.DBTwins[ind]
        if(ele.modelID==modelID){
            resultArr.push(ele)
        }
    }
    return resultArr;
}

globalCache.prototype.getSingleDBTwinByName=function(twinName){
    var twinID=this.twinDisplayNameMapToID[twinName]
    return this.DBTwins[twinID]
}

globalCache.prototype.getSingleDBTwinByIndoorFeatureID=function(featureID){
    for(var ind in this.DBTwins){
        var ele=this.DBTwins[ind]
        if(ele.GIS && ele.GIS.indoor){
            if(ele.GIS.indoor.IndoorFeatureID==featureID) return ele
        }
    }
    return null;
}

globalCache.prototype.getSingleDBModelByID=function(modelID){
    for(var i=0;i<this.DBModelsArr.length;i++){
        var ele = this.DBModelsArr[i]
        if(ele.id==modelID){
            return ele
        }
    }
    return null;
}

globalCache.prototype.storeSingleDBModel=function(singleDBModelInfo){
    var modelID = singleDBModelInfo.id
    for(var i=0;i<this.DBModelsArr.length;i++){
        var ele = this.DBModelsArr[i]
        if(ele.id==modelID){
            for(var ind in ele) delete ele[ind]
            for(var ind in singleDBModelInfo) ele[ind]=singleDBModelInfo[ind]
            return;
        }
    }
    //it is a new single model if code reaches here
    this.DBModelsArr.push(singleDBModelInfo)
    this.sortDBModelsArr()
}

globalCache.prototype.storeDBModelsArr=function(DBModelsArr){
    this.DBModelsArr.length=0
    this.DBModelsArr=this.DBModelsArr.concat(DBModelsArr)
    this.sortDBModelsArr()
    
}
globalCache.prototype.sortDBModelsArr=function(){
    this.DBModelsArr.sort(function (a, b) { 
        var aName=a.displayName.toLowerCase()
        var bName=b.displayName.toLowerCase()
        return aName.localeCompare(bName) 
    });
}


globalCache.prototype.getStoredAllInboundRelationsSources=function(twinID){
    var srcTwins={}
    for(var srcTwin in this.storedOutboundRelationships){
        var arr=this.storedOutboundRelationships[srcTwin]
        arr.forEach(oneRelation=>{
            if(oneRelation["$targetId"]==twinID) srcTwins[oneRelation["$sourceId"]]=1
        })
    }
    return srcTwins;
}

globalCache.prototype.storeTwinRelationships=function(relationsData){
    relationsData.forEach((oneRelationship)=>{
        var twinID=oneRelationship['$sourceId']
        this.storedOutboundRelationships[twinID]=[]
    })

    relationsData.forEach((oneRelationship)=>{
        this.storedOutboundRelationships[oneRelationship['$sourceId']].push(oneRelationship)
    })
}

globalCache.prototype.storeTwinRelationships_append=function(relationsData){
    relationsData.forEach((oneRelationship)=>{
        if(!this.storedOutboundRelationships[oneRelationship['$sourceId']])
            this.storedOutboundRelationships[oneRelationship['$sourceId']]=[]
        this.storedOutboundRelationships[oneRelationship['$sourceId']].push(oneRelationship)
    })
}

globalCache.prototype.storeTwinRelationships_remove=function(relationsData){
    relationsData.forEach((oneRelationship)=>{
        var srcID=oneRelationship["srcID"]
        if(this.storedOutboundRelationships[srcID]){
            var arr=this.storedOutboundRelationships[srcID]
            for(var i=0;i<arr.length;i++){
                if(arr[i]['$relationshipId']==oneRelationship["relID"]){
                    arr.splice(i,1)
                    break;
                }
            }
        }
    })
}

globalCache.prototype.findAllInputsInScript=function(calcScript,formulaTwinName){
    //find all properties in the script
    calcScript+="\n" //make sure the below patterns using "[^. ] not fail because of it is the end of string "
    var patt = /_self(?<=_self)\[\".*?(?=\"\][^\[])\"\]/g; 
    var allSelfProperties=calcScript.match(patt)||[];
    var countAllSelfTimes={}
    allSelfProperties.forEach(oneSelf=>{
        if(countAllSelfTimes[oneSelf]) countAllSelfTimes[oneSelf]+=1
        else countAllSelfTimes[oneSelf]=1
    })

    var patt = /_twinVal(?<=_twinVal)\[\".*?(?=\"\][^\[])\"\]/g; 
    var allOtherTwinProperties=calcScript.match(patt)||[];
    var listAllOthers={}
    allOtherTwinProperties.forEach(oneOther=>{listAllOthers[oneOther]=1 })

    //analyze all variables that can not be as input as they are changed during calcuation
    //they disqualify as input as they will trigger infinite calculation, all these belongs to _self
    var outputpatt = /_self(?<=_self)\[\"[^;{]*?[^\=](?=\=[^\=])/g;
    var outputProperties=calcScript.match(outputpatt)||[];
    var countOutputTimes={}
    outputProperties.forEach(oneOutput=>{
        if(countOutputTimes[oneOutput]) countOutputTimes[oneOutput]+=1
        else countOutputTimes[oneOutput]=1
    })
    

    var inputPropertiesArr=[]
    for(var ind in listAllOthers) inputPropertiesArr.push(ind)
    for(var ind in countAllSelfTimes){
        if(countAllSelfTimes[ind]!=countOutputTimes[ind]) inputPropertiesArr.push(ind)
    }

    var returnArr=[]
    inputPropertiesArr.forEach(oneProperty=>{
        var oneInputObj={} //twinID, path, value
        var fetchpropertypatt = /(?<=\[\").*?(?=\"\])/g;
        if(oneProperty.startsWith("_self")){
            oneInputObj.path=oneProperty.match(fetchpropertypatt);
            oneInputObj.twinName=formulaTwinName+"(self)"
            oneInputObj.twinName_origin=formulaTwinName
            var twinID=this.twinDisplayNameMapToID[formulaTwinName]
            oneInputObj.value=this.searchValue(this.storedTwins[twinID],oneInputObj.path)
        }else if(oneProperty.startsWith("_twinVal")){
            var arr=oneProperty.match(fetchpropertypatt);
            var firstEle=arr[0]
            arr.shift()
            oneInputObj.path=arr
            var twinID=this.twinDisplayNameMapToID[firstEle]
            oneInputObj.value=this.searchValue(this.storedTwins[twinID],oneInputObj.path)
            oneInputObj.twinName=oneInputObj.twinName_origin=firstEle
        }
        returnArr.push(oneInputObj)
    })
    return returnArr
}

globalCache.prototype.searchValue=function(originElementInfo,pathArr){
    if(pathArr.length==0) return null;
    var theJson=originElementInfo
    for(var i=0;i<pathArr.length;i++){
        var key=pathArr[i]
        theJson=theJson[key]
        if(theJson==null) return null;
    }
    return theJson //it should be the final value
}

globalCache.prototype.shapeSvg=function(shape,color,secondColor){
    var svgStart='<svg xmlns:svg="http://www.w3.org/2000/svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none" version="1.1" >'
    if(secondColor){
        if(color=="none") color="darkGray" 
        var gradientDefinition='<defs>'+
            '<linearGradient id="grad1" x1="0%" y1="0%" x2="0%" y2="100%">'+
            '<stop offset="0%" style="stop-color:'+color+';stop-opacity:1" />'+
            '<stop offset="50%" style="stop-color:'+color+';stop-opacity:1" />'+
            '<stop offset="51%" style="stop-color:'+secondColor+';stop-opacity:1" />'+
            '</linearGradient></defs>'
        svgStart+=gradientDefinition
    }
    var colorStr=(secondColor)?"url(#grad1)":color
    if(shape=="ellipse"){
        return svgStart+'<circle cx="50" cy="50" r="50"  fill="'+colorStr+'"/></svg>'
    }else if(shape=="hexagon"){
        return svgStart+'<polygon points="50 0, 93.3 25, 93.3 75, 50 100, 6.7 75, 6.7 25"  fill="'+colorStr+'" /></svg>'
    }else if(shape=="rectangle"){
        return svgStart+'<rect x="10" y="10" rx="10" ry="10" width="80" height="80" fill="'+colorStr+'" /></svg>'
    }
}

globalCache.prototype.makeDOMDraggable=function(dom,ignoreChildDomType){
    ignoreChildDomType=ignoreChildDomType||["LABEL","TD","B","A","INPUT","PRE"]
    dom.on('mousedown',(e)=>{
        if(ignoreChildDomType.indexOf(e.target.tagName)!=-1) return;
        var domOffset=dom.offset()
        dom.mouseStartDragOffset=[domOffset.left-e.clientX, domOffset.top-e.clientY]
        $('body').on('mouseup',()=>{
            dom.mouseStartDragOffset=null
            $('body').off('mousemove')
            $('body').off('mouseup')
        })
        $('body').on('mousemove',(e)=>{
            e.preventDefault()
            if(dom.mouseStartDragOffset){
                var newLeft= e.clientX+dom.mouseStartDragOffset[0]
                var newTop=e.clientY+dom.mouseStartDragOffset[1]
                dom.css({"left":newLeft+"px","top":newTop+"px","transform":"none"})
            }
        })
    })
}

globalCache.prototype.generateModelIcon = function (modelID,dimension,isFixSize,twinID) {
    var dbModelInfo = this.getSingleDBModelByID(modelID)
    var colorCode = "darkGray"
    var shape = "ellipse"
    var avarta = null
    dimension = dimension||20;
    if (this.visualDefinition["default"].detail[modelID]) {
        var visualJson = this.visualDefinition["default"].detail[modelID]
        var colorCode = visualJson.color || "darkGray"
        var secondColorCode = visualJson.secondColor
        var shape = visualJson.shape || "ellipse"
        var avarta = visualJson.avarta
        if(!isFixSize){
            if (visualJson.dimensionRatio) dimension *= parseFloat(visualJson.dimensionRatio)
            if (dimension > 60) dimension = 60    
        }
    }
    var iconDOMDimension = Math.max(dimension, 20) //other wise it is too small to be in vertical middle of parent div
    var iconDOM = $("<div style='width:" + iconDOMDimension + "px;height:" + iconDOMDimension + "px;float:left;position:relative'></div>")
    if (dbModelInfo && dbModelInfo.isIoTDeviceModel) {
        var drawSmallIoTDiv=true
        if(twinID){
            var dbTwin=this.DBTwins[twinID]
            if(dbTwin["IoTDeviceID"]==null) drawSmallIoTDiv=false
        }
        if(drawSmallIoTDiv){
            var iotDiv = $("<div class='w3-border' style='position:absolute;right:-5px;padding:0px 2px;top:-7px;border-radius: 3px;font-size:7px'>IoT</div>")
            iconDOM.append(iotDiv)
        }
    }

    var imgSrc = encodeURIComponent(this.shapeSvg(shape, colorCode, secondColorCode))
    var shapeImg = $("<img src='data:image/svg+xml;utf8," + imgSrc + "'></img>")
    shapeImg.css({ "width": dimension + "px", "height": dimension + "px" })
    if (dimension < iconDOMDimension) {
        shapeImg.css({ "position": "absolute", "top": (iconDOMDimension - dimension) / 2 + "px", "left": (iconDOMDimension - dimension) / 2 + "px" })
    }
    iconDOM.append(shapeImg)
    if (avarta) {
        var avartaimg = $(`<img style='max-width:${dimension * 0.75}px;max-height:${dimension * 0.75}px;position:absolute;left:50%;top:50%;transform:translateX(-50%) translateY(-50%)' src='${avarta}'></img>`)
        iconDOM.append(avartaimg)
    }
    return iconDOM
}

globalCache.prototype.uuidv4=function() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

globalCache.prototype.generateTelemetrySample = function(telemetryProperties){
    var sampleObj={}
    telemetryProperties.forEach(onep=>{
        if(onep.type!="telemetry") return;
        var pathArr=onep.path
        var ptype=onep.ptype
        
        var theRoot=sampleObj
        for(var i=0;i<pathArr.length;i++){
            var str=pathArr[i]
            if(i==pathArr.length-1) {
                var valueSample=this.propertyTypeSampleValue(ptype)
                theRoot[str]=valueSample
            }else{
                if(!theRoot[str])theRoot[str]={}
                theRoot=theRoot[str]
            }
        }
    })
    return sampleObj
}

globalCache.prototype.propertyTypeSampleValue = function(ptype){
    //["Enum","Object","boolean","date","dateTime","double","duration","float","integer","long","string","time"]
    var mapping={
        "enumerator":"stringValue"
        ,"string":"stringValue"
        ,"boolean":true
        ,"dateTime":new Date().toISOString()
        ,"date": (new Date().toISOString()).split("T")[0]
        ,"double":0.1
        ,"float":0.1
        ,"duration":"PT16H30M"
        ,"integer":0
        ,"long":0
        ,"time": "T"+((new Date().toISOString()).split("T")[1])
    }
    if(mapping[ptype]!=null) return mapping[ptype]
    else return "unknown"
}

module.exports = new globalCache();