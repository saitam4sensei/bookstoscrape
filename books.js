'use strict';

const puppeteer = require('puppeteer');
const fs = require('fs');


(async () => {
    // var browserArguments = [];
    var browserArguments =  ['--no-sandbox', '--disable-setuid-sandbox', '-disable-gpu', '--no-first-run', '--disable-notifications', '--disable-extensions'];
    let browser = await puppeteer.launch({
        args: browserArguments,
        headless: false
    });

    
    let newPage = await browser.newPage();
    let page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    
    let url = "http://books.toscrape.com/"
    await page.goto(url, { waitUntil: 'load', timeout: 0 });
    let DataResult = [];

    const buttonSelector = '.next > a';
    let nextButtonExist = false;

    do{
        
        await getCurrentPage();
        try {
            const nextButton = await page.$eval(buttonSelector, a => a.href);
            nextButtonExist = true;
            await page.goto(nextButton, { waitUntil: 'load', timeout: 0 });
            //using page.goto instead of page.next click
        } catch (err) {
            nextButtonExist = false;
            console.log('Could not find the "Next button", '
                + 'we\'ve reached the end.');
        }
        
    }while(nextButtonExist)


    async function getCurrentPage(){
        
        await page.waitForSelector('#default  h3 > a');
        console.log('BROWSING............');
        
        let urls = await page.$$eval('section ol > li', links => {
            links = links.map(el => el.querySelector('#default h3 > a').href)
            return links;
        });
        
        //choosing for loop instead of foreach/map
        //foreach opens all 20 tabs at the same time (in my case: my browser crashes)
        for(let i = 0; i < urls.length; i++) {
            let data = {};
            
            await newPage.goto(urls[i], { waitUntil: 'load', timeout: 0 });
            data['title'] = await newPage.$eval('.product_main > h1', text => text.textContent);
            data['price'] = await newPage.$eval('.price_color', text => text.textContent);
            data['imageUrl'] = await newPage.$eval('#product_gallery img', img => img.src);
            try{ //some items dont have description
                let product_description = await newPage.$eval('#product_description', div => div.nextSibling.nextSibling.textContent)
                data['description'] = product_description.substring(0, 30)+ " ...";
            }
            catch(e){
                data['description'] = '...'
            }
            
            data['availability'] = await newPage.$eval('.instock.availability', text => {
                text = text.textContent.replace(/[\n\r\t\s]+/g, ' ')
                return text;
            });
            data['rating'] = await newPage.evaluate(() => {
                const stars = [...document.querySelectorAll('#content_inner article div.row div.col-sm-6.product_main p.star-rating i')].filter(e => {
                    //console.log(window.getComputedStyle(e).color);
                  const color = window.getComputedStyle(e).color;
                  return color == 'rgb(230, 206, 49)';
                });
              
                return stars.length
              });

            DataResult.push(data);
        }
    }

    fs.writeFile("data.json", JSON.stringify(DataResult), 'utf8', function(err) {
        if(err) {
            return console.log(err);
        }
    });
    
})();