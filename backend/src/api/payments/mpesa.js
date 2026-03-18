import { initiateMpesa } from "../../lib/mpesa.js";


export default async function handler(req, res) {
const { phone, amount } = req.body;
const response = await initiateMpesa(phone, amount);
res.json(response);
}