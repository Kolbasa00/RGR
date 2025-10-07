const fs = require('fs');
const { Telegraf } = require('telegraf');

process.removeAllListeners('warning');
// Словарь для хранения информации о заказах
let orders = {};
const csvFilePath = "orders.csv";
const dashboardUrl = "http://127.0.0.1:8050/";

const bot = new Telegraf("8306340829:AAGwRxU6hFRbvhVV5tz9HNr92eXrT-W8zDI");

async function start(ctx) {
    await ctx.reply(
        'Привет! Я бот управления заказами консалтинговой компании. ' +
        'Используй команды:\n' +
        '/add - добавить новый заказ\n' +
        '/update - обновить заказ\n' +
        '/delete - удалить заказ\n' +
        '/list - список заказов\n' +
        '/info - детальная информация\n' +
        '/status - изменить статус\n' +
        '/manager - назначить менеджера\n' +
        '/dashboard - аналитический дашборд'
    );
}

async function addOrder(ctx) {
    try {
        const messageText = ctx.message.text.split(' ').slice(1).join(' ');
        const [client, service, deadline, budget] = messageText.split(',');
        const budgetValue = parseFloat(budget);
        
        if (!client || !service || !deadline || isNaN(budgetValue)) {
            throw new Error('Invalid input');
        }
    } catch (error) {
        await ctx.reply(
            'Ошибка в формате ввода. Используйте: ' +
            '/add Клиент, Услуга, Срок_исполнения, Бюджет\n' +
            'Пример: /add ООО Рога и копыта, Бизнес-консалтинг, 2024-10-10, 50000'
        );
        return;
    }
    
    const messageText = ctx.message.text.split(' ').slice(1).join(' ');
    const [client, service, deadline, budget] = messageText.split(',');
    const budgetValue = parseFloat(budget);
    
    const orderId = Object.keys(orders).length + 1;
    orders[orderId] = {
        'client': client.trim(),
        'service': service.trim(),
        'deadline': deadline.trim(),
        'budget': budgetValue,
        'status': 'Новый',
        'manager': 'Не назначен'
    };
    
    await ctx.reply(`Заказ №${orderId} успешно создан!`);
    saveToCsv();
}

async function updateOrder(ctx) {
    try {
        const messageText = ctx.message.text.split(' ').slice(1).join(' ');
        const parts = messageText.split(',');
        const orderIdStr = parts[0];
        const field = parts[1];
        const value = parts.slice(2).join(',').trim();
        const orderId = parseInt(orderIdStr);
        
        if (!orderIdStr || !field || !value) {
            throw new Error('Invalid input');
        }
    } catch (error) {
        await ctx.reply(
            'Ошибка в формате ввода. Используйте: ' +
            '/update номер_заказа, поле, значение\n' +
            'Пример: /update 12345, срок_исполнения, 2024-09-10'
        );
        return;
    }
    
    const messageText = ctx.message.text.split(' ').slice(1).join(' ');
    const parts = messageText.split(',');
    const orderIdStr = parts[0];
    const field = parts[1];
    const value = parts.slice(2).join(',').trim();
    const orderId = parseInt(orderIdStr);
    
    if (orders[orderId]) {
        if (field.trim() in orders[orderId]) {
            orders[orderId][field.trim()] = value;
            await ctx.reply(`Заказ №${orderId} успешно обновлен!`);
            saveToCsv();
        } else {
            await ctx.reply('Указанное поле не существует');
        }
    } else {
        await ctx.reply(`Заказ №${orderId} не найден`);
    }
}

async function deleteOrder(ctx) {
    try {
        const orderId = parseInt(ctx.message.text.split(' ')[1]);
        if (isNaN(orderId)) {
            throw new Error('Invalid order ID');
        }
    } catch (error) {
        await ctx.reply('Используйте: /delete номер_заказа');
        return;
    }
    
    const orderId = parseInt(ctx.message.text.split(' ')[1]);
    
    if (orders[orderId]) {
        delete orders[orderId];
        await ctx.reply(`Заказ №${orderId} удален!`);
        saveToCsv();
    } else {
        await ctx.reply(`Заказ №${orderId} не найден`);
    }
}

async function listOrders(ctx) {
    if (Object.keys(orders).length > 0) {
        const ordersList = [];
        for (const [orderId, orderInfo] of Object.entries(orders)) {
            ordersList.push(
                `№${orderId}: ${orderInfo['client']} - ${orderInfo['service']} ` +
                `(${orderInfo['status']})`
            );
        }
        await ctx.reply('Список заказов:\n' + ordersList.join('\n'));
    } else {
        await ctx.reply('Заказов нет');
    }
}

async function orderInfo(ctx) {
    try {
        const orderId = parseInt(ctx.message.text.split(' ')[1]);
        if (isNaN(orderId)) {
            throw new Error('Invalid order ID');
        }
    } catch (error) {
        await ctx.reply('Используйте: /info номер_заказа');
        return;
    }
    
    const orderId = parseInt(ctx.message.text.split(' ')[1]);
    
    if (orders[orderId]) {
        const order = orders[orderId];
        const infoText =
            `Детальная информация о заказе №${orderId}:\n` +
            `Клиент: ${order['client']}\n` +
            `Услуга: ${order['service']}\n` +
            `Срок исполнения: ${order['deadline']}\n` +
            `Бюджет: ${order['budget']}\n` +
            `Статус: ${order['status']}\n` +
            `Менеджер: ${order['manager']}`;
        
        await ctx.reply(infoText);
    } else {
        await ctx.reply(`Заказ №${orderId} не найден`);
    }
}

async function changeStatus(ctx) {
    try {
        const messageText = ctx.message.text.split(' ').slice(1).join(' ');
        const [orderIdStr, newStatus] = messageText.split(',');
        const orderId = parseInt(orderIdStr);
        
        if (!orderIdStr || !newStatus) {
            throw new Error('Invalid input');
        }
    } catch (error) {
        await ctx.reply(
            'Используйте: /status номер_заказа, новый_статус\n' +
            'Пример: /status 12345, В работе'
        );
        return;
    }
    
    const messageText = ctx.message.text.split(' ').slice(1).join(' ');
    const [orderIdStr, newStatus] = messageText.split(',');
    const orderId = parseInt(orderIdStr);
    
    if (orders[orderId]) {
        orders[orderId]['status'] = newStatus.trim();
        await ctx.reply(`Статус заказа №${orderId} изменен на "${newStatus}"`);
        saveToCsv();
    } else {
        await ctx.reply(`Заказ №${orderId} не найден`);
    }
}

async function assignManager(ctx) {
    try {
        const messageText = ctx.message.text.split(' ').slice(1).join(' ');
        const [orderIdStr, manager] = messageText.split(',');
        const orderId = parseInt(orderIdStr);
        
        if (!orderIdStr || !manager) {
            throw new Error('Invalid input');
        }
    } catch (error) {
        await ctx.reply(
            'Используйте: /manager номер_заказа, ФИО_менеджера\n' +
            'Пример: /manager 12345, Иванов И.И.'
        );
        return;
    }
    
    const messageText = ctx.message.text.split(' ').slice(1).join(' ');
    const [orderIdStr, manager] = messageText.split(',');
    const orderId = parseInt(orderIdStr);
    
    if (orders[orderId]) {
        orders[orderId]['manager'] = manager.trim();
        await ctx.reply(`На заказ №${orderId} назначен менеджер: ${manager}`);
        saveToCsv();
    } else {
        await ctx.reply(`Заказ №${orderId} не найден`);
    }
}

async function dashboard(ctx) {
    await ctx.reply(`Аналитический дашборд: ${dashboardUrl}`);
}

function saveToCsv() {
    const rows = [['OrderID', 'Client', 'Service', 'Deadline', 'Budget', 'Status', 'Manager']];
    
    for (const [orderId, orderInfo] of Object.entries(orders)) {
        rows.push([
            orderId,
            orderInfo['client'],
            orderInfo['service'],
            orderInfo['deadline'],
            orderInfo['budget'],
            orderInfo['status'],
            orderInfo['manager']
        ]);
    }
    
    const csvContent = rows.map(row => row.join(',')).join('\n');
    fs.writeFileSync(csvFilePath, csvContent, 'utf8');
}

function loadFromCsv() {
    orders = {};
    
    if (!fs.existsSync(csvFilePath)) {
        return;
    }
    
    try {
        const data = fs.readFileSync(csvFilePath, 'utf8');
        const lines = data.trim().split('\n');
        
        // Пропускаем заголовок
        for (let i = 1; i < lines.length; i++) {
            const cells = lines[i].split(',');
            if (cells.length >= 7) {
                const orderId = parseInt(cells[0]);
                orders[orderId] = {
                    'client': cells[1],
                    'service': cells[2],
                    'deadline': cells[3],
                    'budget': parseFloat(cells[4]),
                    'status': cells[5],
                    'manager': cells[6]
                };
            }
        }
    } catch (error) {
        console.error('Ошибка при загрузке CSV:', error);
    }
}

function main() {
    loadFromCsv();
    
    bot.command("start", start);
    bot.command("add", addOrder);
    bot.command("update", updateOrder);
    bot.command("delete", deleteOrder);
    bot.command("list", listOrders);
    bot.command("info", orderInfo);
    bot.command("status", changeStatus);
    bot.command("manager", assignManager);
    bot.command("dashboard", dashboard);
    
    console.log("Бот управления заказами запущен. Ожидание обновлений...");
    
    bot.launch();
}

// Обработка graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

if (require.main === module) {
    main();
}