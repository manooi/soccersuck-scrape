import axios from "axios";
import { load } from 'cheerio';
import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";

const sleep = (ms) => {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  })
}

const insertToTable = async (item, client) => {
  const params = {
    TableName: 'soccer-news', // Replace with the name of your DynamoDB table
    Item: item
  };

  const command = new PutItemCommand(params);

  try {
    await client.send(command);
  }
  catch (error) {
    console.log(error);
  }
}

const descriptionCrawler = async (topicId, title, client) => {
  const result = await axios.get(`https://www.soccersuck.com/boards/topic/${topicId}`);
  const htmlData = result.data;
  const $ = load(htmlData);
  const postDesc = $('.post_desc').text();

  const item = {
    id: { "S": topicId },
    title: { "S": title },
    content: { "S": postDesc }
  };

  insertToTable(item, client);
}


export const handler = async (event) => {
  try {
    // DynamoDB Client
    const client = new DynamoDBClient({ region: "ap-southeast-1" });

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
      const title = $(element).attr('title');
      const url = $(element).find('a').attr('href');
      const id = url.split("/").pop();
      latestNews.push({
        title: title,
        url: url,
        id: id
      });
    });

    for (const news of latestNews) {
      await sleep(200);
      descriptionCrawler(news.id, news.title, client);
    }

    await sleep(5000);
  }

  catch (error) {
    console.error(error);
  }
};

// handler();