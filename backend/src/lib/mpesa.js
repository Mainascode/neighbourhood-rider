import axios from "axios";


export async function initiateMpesa(phone, amount) {
return { status: "PENDING", phone, amount };
}