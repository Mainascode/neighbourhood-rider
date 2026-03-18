
self.addEventListener("push", function (event) {
    const data = event.data.json();
    const title = data.title || "Neighborhood Rider";
    const options = {
        body: data.body || "New notification",
        icon: "/logo.jpeg", // Ensure this path is correct relative to public/
        badge: "/logo.jpeg",
        data: {
            url: data.url || "/",
        },
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", function (event) {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: "window" }).then((windowClients) => {
            // Check if there is already a window for this app
            for (let i = 0; i < windowClients.length; i++) {
                const client = windowClients[i];
                if (client.url === event.notification.data.url && "focus" in client) {
                    return client.focus();
                }
            }
            // If not, open a new window
            if (clients.openWindow) {
                return clients.openWindow(event.notification.data.url);
            }
        })
    );
});
