var apiKey = '55be07425588d2bb447b1ab4818a31f5';//ключ на сервисе 2Captcha
var puppeteer = require('puppeteer');//для контроля работы хрома
var request = require('request-promise-native');//для работы с реквестами

var poll = require('promise-poller').default;
var chromeOptions = {
  headless:false,
  defaultViewport: null,
  slowMo:500,
};
(async function main() {
  
  var browser = await puppeteer.launch(chromeOptions);//запуск браузера
  var page = await browser.newPage();//новая страница
  await page.goto('https://primaries.by/');//переход на праймериз

 await page.click('[data-button = "grey"]');//клик на кандидата - CSS селектор по атрибуту
 var img = await page.$('[class="W-100p b-radius-5"]')//картинка с капчей - ее CSS селектор по 2м классам, чтобы найти в DOM
 
 var capcthaImg = await page.evaluate(img => img.currentSrc, img);//base64 код картинки
 //console.log(capcthaImg)

 var requestId = await sendingPostRequest(capcthaImg);//айди нашего запроса

 var response = await waitingForResult(apiKey, requestId);//решенная капча

 await page.type('input[name="captcha"]', response);//ввод символов капчи
 
 await page.click('.b-radius-5 input[type="submit"]');//подтвердить

})()

    async function sendingPostRequest(captcha) {
      var formData = {
        method: 'base64',
        body: captcha,
        key: apiKey,
        language: 2,// 2 для латиницы
        json: 1//ответ нужен в джсон
      };
      var response = await request.post('http://2captcha.com/in.php', {form: formData});//отправляем капчу на сервер методом пост
      console.log('номер нашего запроса -'+JSON.parse(response).request)// номер нашего запроса
      return JSON.parse(response).request;
    }

    async function waitingForResult(key, id, retries = 30, interval = 1500, delay = 10000) {//интервал и количество попыток для запроса
      await timeout(delay);//выжидаем прежде чем начать запрашивать решенную капчу
      return poll({
        taskFn: captchaSolve(key, id),//передаем наш ключ и номер нашего запроса в качестве аргументов
        interval,
        retries
      });
    }
    
    function captchaSolve(apiKey, requestId) {
      console.log('ожидание ответа с сервера...')
      var url = `http://2captcha.com/res.php?key=${apiKey}&action=get&id=${requestId}&json=1`;
      return async function() {
        return new Promise(async function(resolve, reject){
          var rawResponse = await request.get(url);//ответ запрашиваем уже методом get
          var resp = JSON.parse(rawResponse);
          console.log(resp)//решенная капча
          if (resp.status === 0) return reject(resp.request);
          resolve(resp.request);
        });
      }
    }
  
    var timeout = millis => new Promise(resolve => setTimeout(resolve, millis));// тайаут для отправки запросов на получение решенной капчи


