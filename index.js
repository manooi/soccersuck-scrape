import axios from "axios";
import { load } from 'cheerio';
import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";

const today = new Date(new Date().getTime() - (7 * 60 * 60 * 1000) ).toISOString().split('T')[0];
const client = new DynamoDBClient({ region: "ap-southeast-1" });

const sleep = (ms) => {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  })
}

const insertToTable = async (item) => {
  const params = {
    TableName: 'soccer-news', // Replace with the name of your DynamoDB table
    Item: item,
    ConditionExpression: 'attribute_not_exists(id)'
  };

  const command = new PutItemCommand(params);

  try {
    await client.send(command);
    console.log(`Successfully added news ${item?.id?.S}.`);
  }
  catch (error) {
    console.log(error);
  }
}

function isNews(post_desc) {
  // check if there is span tag, length should be > 0
  return post_desc.find('span')?.length > 0;
}


function crawlNews(post_desc) {
  // div span
  return post_desc.find('span').text().trim();
}

function crawlGameResult($) {
  try {
    return $('.post_desc > div').text().split("\n").map((i) => i.trim()).filter((i) => i)[0];
  }
  catch {
    return "";
  }
}

const contentCrawler = async (news) => {
  const result = await axios.get(`https://www.soccersuck.com/boards/topic/${news.id}`);
  const htmlData = result.data;
  const $ = load(htmlData);
  const $postDesc = $('.post_desc');
  const postDesc = isNews($postDesc) ? crawlNews($postDesc) : crawlGameResult($);
  const imgUrls = $('.post_desc img').toArray();
  let url = "";
  if (imgUrls && imgUrls.length >= 2) {
    url = imgUrls[1]?.attribs?.src ?? "";
  }

  const item = {
    id: { "S": news.id },
    crawledDate: { "S": today },
    title: { "S": news.title },
    content: { "S": postDesc },
    imgUrl: { "S": url },
    category: { "S": news.category }
  };

  insertToTable(item);
}


export const handler = async (event) => {
  try {

    // Get raw html
    const response = await axios.request({
      method: "GET",
      url: "https://www.soccersuck.com",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36"
      }
    });

    const htmlData = response.data;
    const $ = load(htmlData);
    const latestnewsTrs = $('.latestnews_tr');

    // Parse dataa
    const latestNews = [];
    latestnewsTrs.each((_, element) => {
      const title = $(element).attr('title').trim();
      const url = $(element).find('a').attr('href');
      const id = url.split("/").pop();
      const category = $(element).find('img').attr('src').split("/").pop().split(".")[0];

      latestNews.push({
        title: title,
        id: id,
        category: category
      });
    });

    for (const news of latestNews) {
      await sleep(200);
      contentCrawler(news);
    }

    await sleep(5000);
  }

  catch (error) {
    console.error(error);
  }
};

// handler();