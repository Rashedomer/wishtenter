const axios = require('axios');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const API_URL = 'http://localhost:5000/api/admin';

async function test() {
  try {
    // Generate token for kinzasheikh403@gmail.com
    const userId = 'badf4670-e786-4460-a6c5-8270904635f7';
    const token = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
    console.log("Token:", token);

    const headers = { Authorization: `Bearer ${token}` };

    console.log("Fetching /stats");
    const stats = await axios.get(`${API_URL}/stats`, { headers });
    console.log("Stats:", stats.data);

    console.log("Fetching /withdrawals");
    const withdrawals = await axios.get(`${API_URL}/withdrawals`, { headers });
    console.log("Withdrawals length:", withdrawals.data.length);

    console.log("Fetching /settings");
    const settings = await axios.get(`${API_URL}/settings`, { headers });
    console.log("Settings:", settings.data);

  } catch (err) {
    if (err.response) {
      console.error("Error Response:", err.response.status, err.response.data);
    } else {
      console.error("Error:", err.message);
    }
  }
}

test();
