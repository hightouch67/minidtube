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
    var t = reqPath.split('/')[2]
    if(t == null || t == undefined)
    { 
        getRobotHTML(function(err, baseHTML) {
            if (error(err, next)) return
            contentHTML = "Fundition.io is a next-generation, decentralized, peer-to-peer crowdfunding and collaboration platform, built on the Steem blockchain, that aims to replace extant, outmoded, centralized models such as Kickstarter, GoFundMe, Indiegogo, and Patreon; while offering a valuable solution to link creative entrepreneurs with like-minded supporters."
            pageTitle = "Fundition.io - Next-Gen Decentralized Crowdfunding"
            description = "Fundition.io is a next-generation, decentralized, peer-to-peer crowdfunding and collaboration platform, built on Steem blockchain."
            url = 'https://fundition.io'+ req.path
            thumbnail = 'https://fundition.io/images/fundition.jpg'
            baseHTML = baseHTML.replace(/@@CONTENT@@/g, contentHTML)
            baseHTML = baseHTML.replace(/@@TITLE@@/g, htmlEncode(pageTitle))
            baseHTML = baseHTML.replace(/@@DESCRIPTION@@/g, htmlEncode(description))
            baseHTML = baseHTML.replace(/@@URL@@/g, htmlEncode(url))
            baseHTML = baseHTML.replace(/@@URLNOHASH@@/g, htmlEncode(url).replace('/#!',''))
            baseHTML = baseHTML.replace(/@@SNAP@@/g, htmlEncode(thumbnail))
            res.send(baseHTML)
        })
    }
    else{
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
    }
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
        console.log(project)
        html += '<h1>'+project.title+'</h1>'
        html += '<h2>Author: '+project.author+'</h2>'
        html += '<h2>Date: '+project.created.split('T')[0]+'</h2>'
        html += '<p><strong>Description: </strong>'+ project.body+'</p>'

        var url = rootDomain+'/#!/'+project.author+'/'+project.permlink
        var snap = getThumbnail(project.body)
        var description = project.body.replace(/(?:\r\n|\r|\n)/g, ' ').substr(0, 300)
        cb(null, html, project.title, project.body, url, snap)
    })
}

function parseProject(project, isComment) {
    newProject = {}
    newProject.author = project.author
    newProject.title = project.title
    newProject.body = cleanText(project.body)
    if(project.basic.description)
    newProject.body = cleanText(project.basic.description)
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


    function cleanText(text){
            if (!text) return text;
            var urlPattern = /\b(?:https?|ftp):\/\/[a-z0-9-+&@#\/%?=~_|!:,.;]*[a-z0-9-+&@#\/%=~_|]/gim;
            text = text.replace(urlPattern, "")
            text = text.replace(/<img[^>"']*((("[^"]*")|('[^']*'))[^"'>]*)*>/g, "");
            text = text.replace(/<(?:.|\n)*?>/gm, '');
            //-- remove BR tags and replace them with line break
            text = text.replace(/<br>/gi, "");
            text = text.replace(/<br\s\/>/gi, "");
            text = text.replace(/<br\/>/gi, "");
            text = text.replace(/<iframe(.+)<\/iframe>/g, "");
            //-- remove P and A tags but preserve what's inside of them
            text = text.replace(/<p.*>/gi, "");
            text = text.replace(/<a.*href="(.*?)".*>(.*?)<\/a>/gi, " $2 ($1)");
        
            //-- remove all inside SCRIPT and STYLE tags
            text = text.replace(/<script.*>[\w\W]{1,}(.*?)[\w\W]{1,}<\/script>/gi, "");
            text = text.replace(/<style.*>[\w\W]{1,}(.*?)[\w\W]{1,}<\/style>/gi, "");
            //-- remove all else
            text = text.replace(/<(?:.|\s)*?>/g, "");
        
            //-- get rid of more than 2 multiple line breaks:
            text = text.replace(/(?:(?:\r\n|\r|\n)\s*){2,}/gim, "");
        
            //-- get rid of more than 2 spaces:
            text = text.replace(/ +(?= )/g, '');
        
            //-- get rid of html-encoded characters:
            text = text.replace(/&nbsp;/gi, " ");
            text = text.replace(/&amp;/gi, "&");
            text = text.replace(/&quot;/gi, '"');
            text = text.replace(/&lt;/gi, '<');
            text = text.replace(/&gt;/gi, '>');
            text = text.replace(/\.[^/.]+$/, "")
            return text;
    }