const fs = require('fs')
const express = require('express')
const cors = require('cors')
const path = require('path')
const { createClient } = require('lightrpc');
const htmlEncode = require('htmlencode').htmlEncode;
const app = express()
app.use(cors())
const port = process.env.PORT || 3000
const jsonfile = require('jsonfile')

const rootDomain = 'https://fundition.io'

const lightrpc = createClient('https://api.steemit.com');

let layouts = {}

app.use('/files', express.static(path.join(__dirname, 'public/files')))
app.use('/favicon.ico', express.static(path.join(__dirname, 'public/files/fnd.png')))
app.get('*', function(req, res, next) {
    var reqPath = null
    if (req.query._escaped_fragment_ && req.query._escaped_fragment_.length > 0)
        reqPath = req.query._escaped_fragment_
    else
        reqPath = req.path

    if (reqPath.startsWith('/sockjs/info')) {
        res.send('{}')
        return;
    }
    console.log(reqPath)
    if(reqPath == '/')
    { 
        res.status(301).redirect("https://fundition.io")
    }
        getProjectHTML(
        reqPath.split('/')[1],
        reqPath.split('/')[2],
        function(err, contentHTML, pageTitle, description, url, thumbnail) {
            if (error(err, next)) return
            getRobotHTML(function(err, baseHTML) {
                if (error(err, next)) return
                baseHTML = baseHTML.replace(/@@CONTENT@@/g, contentHTML)
                baseHTML = baseHTML.replace(/@@TITLE@@/g, htmlEncode(pageTitle))
                baseHTML = baseHTML.replace(/@@DESCRIPTION@@/g, htmlEncode(description))
                baseHTML = baseHTML.replace(/@@URL@@/g, htmlEncode(url))
                baseHTML = baseHTML.replace(/@@URLNOHASH@@/g, htmlEncode(url).replace('/#!',''))
                baseHTML = baseHTML.replace(/@@SNAP@@/g, htmlEncode(thumbnail))
                res.send(baseHTML)
            })
        })
})

app.listen(port, () => console.log('minifundition listening on port '+port))

function error(err, next) {
    if (err) {
        console.log(err)
        next()
        return true
    }
    return false
}

function getRobotHTML(cb) {
        fs.readFile(path.join(__dirname,"static","robots.html"), 'utf8', function (err,data) {
            if (err) {
                cb(err)
                return
            } else {
                layouts.robot = data
                cb(null, data)
                return
            }
        });
    
}

function getProjectHTML(author, permlink, cb) {
    lightrpc.send('get_state', [`/myfundition/${author}/${permlink}`], function(err, result) {
        if (err) {
            cb(err)
            return
        }
        author = author.replace('@','')
        var project = parseProject(result.content[author+'/'+permlink])
        if (!project.body) {
            cb('Weird error')
            return;
        }
        var html = ''
        html += '<h1>'+project.basics.title+'</h1>'
        html += '<h2>Author: '+project.author+'</h2>'
        html += '<h2>Date: '+project.created.split('T')[0]+'</h2>'
        html += '<p><strong>Description: </strong>'+project.basics.description.replace(/(?:\r\n|\r|\n)/g, '<br />')+'</p>'

        var url = rootDomain+'/#!/'+project.author+'/'+project.permlink
        var snap = getThumbnail(project.basics.description)
        var description = project.basics.description.replace(/(?:\r\n|\r|\n)/g, ' ').substr(0, 300)
        cb(null, html, project.basics.title, project.basics.description, url, snap)
    })
}

function parseProject(project, isComment) {
    try {
      var newProject = JSON.parse(project.json_metadata)
      } catch(e) {
        console.log(e)
    }
    if (!newProject) newProject = {}
    newProject.author = project.author
    newProject.body = project.body
    newProject.total_payout_value = project.total_payout_value
    newProject.curator_payout_value = project.curator_payout_value
    newProject.pending_payout_value = project.pending_payout_value
    newProject.permlink = project.permlink
    newProject.created = project.created
    newProject.net_rshares = project.net_rshares
    newProject.reblogged_by = project.reblogged_by
    return newProject;
}

function getThumbnail(string){
    if(string.match('^http://')){
        string = string.replace("http://","https://")
        return string
    }
   
    var matches = string.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (matches) {
        return string
    }
    else {
        var pattern = "(http(s?):)([/|.|\\w|\\s])*." + "(?:jpe?g|gif|png|JPG)";
        var res = string.match(pattern);
        if (res) {
            return res[0]
        }
        else {
            pattern = "(http(s?):\/\/.*\.(?:jpe?g|gif|png|JPG))";
            res = string.match(pattern);
            if (res) {
                return res[0]
            }
        }
    }}
