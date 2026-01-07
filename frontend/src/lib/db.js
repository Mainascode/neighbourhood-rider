// Global in-memory store for demo purposes
// In production, this should be replaced with a real database (Postgres, MongoDB, etc.)

let globalUsers = [];
let globalOrders = [];
let globalRiders = [
    { id: 1, name: "Kevin M.", status: "Available", location: "Kileleshwa" },
    { id: 2, name: "Brian K.", status: "Available", location: "Westlands" },
    { id: 3, name: "Sam N.", status: "Busy", location: "CBD" },
];

const ADMIN_USER = {
    email: "mainaemmanuel855@gmail.com",
    password: "admin",
};

// Singleton pattern to prevent reset on hot-reload in dev (to some extent)
if (global.users) globalUsers = global.users;
else global.users = globalUsers;

if (global.orders) globalOrders = global.orders;
else global.orders = globalOrders;

if (global.riders) globalRiders = global.riders;
else global.riders = globalRiders;

export const db = {
    users: global.users,
    orders: global.orders,
    riders: global.riders,
    ADMIN_USER
};
