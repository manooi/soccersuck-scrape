import { axios } from "axios";

export const handler = async (event) => {
  // const response = {
  //   statusCode: 200,
  //   body: JSON.stringify('Hello from Lambda!'),
  // };

  axios
    .get('https://www.reddit.com/r/programming.json')
    .then((response) => {
      console.log(response)
      return response;
    })
    .catch((error) => {
      console.error(error)
    });
};
