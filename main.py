import csv
from telegram import Update
from telegram.ext import Updater, CommandHandler, MessageHandler, CallbackContext, Filters

# Словарь для хранения информации о заказах
orders = {}

csv_file_path = "orders.csv"
dashboard_url = "http://127.0.0.1:8050/"

def start(update: Update, context: CallbackContext) -> None:
    update.message.reply_text(
        'Привет! Я бот управления заказами консалтинговой компании. '
        'Используй команды:\n'
        '/add - добавить новый заказ\n'
        '/update - обновить заказ\n'
        '/delete - удалить заказ\n'
        '/list - список заказов\n'
        '/info - детальная информация\n'
        '/status - изменить статус\n'
        '/manager - назначить менеджера\n'
        '/dashboard - аналитический дашборд'
    )

def add_order(update: Update, context: CallbackContext) -> None:
    message_text = update.message.text.split(maxsplit=1)[1]
    
    try:
        client, service, deadline, budget = message_text.split(',')
        budget = float(budget)
    except ValueError:
        update.message.reply_text(
            'Ошибка в формате ввода. Используйте: '
            '/add Клиент, Услуга, Срок_исполнения, Бюджет\n'
            'Пример: /add ООО Рога и копыта, Бизнес-консалтинг, 2025-10-10, 50000'
        )
        return
    
    order_id = len(orders) + 1
    orders[order_id] = {
        'client': client.strip(),
        'service': service.strip(),
        'deadline': deadline.strip(),
        'budget': budget,
        'status': 'Новый',
        'manager': 'Не назначен'
    }
    
    update.message.reply_text(f'Заказ №{order_id} успешно создан!')
    save_to_csv()

def update_order(update: Update, context: CallbackContext) -> None:
    message_text = update.message.text.split(maxsplit=1)[1]
    
    try:
        order_id_str, field, value = message_text.split(',', 2)
        order_id = int(order_id_str)
    except ValueError:
        update.message.reply_text(
            'Ошибка в формате ввода. Используйте: '
            '/update номер_заказа, поле, значение\n'
            'Пример: /update 12345, срок_исполнения, 2024-09-10'
        )
        return
    
    if order_id in orders:
        if field.strip() in orders[order_id]:
            orders[order_id][field.strip()] = value.strip()
            update.message.reply_text(f'Заказ №{order_id} успешно обновлен!')
            save_to_csv()
        else:
            update.message.reply_text('Указанное поле не существует')
    else:
        update.message.reply_text(f'Заказ №{order_id} не найден')

def delete_order(update: Update, context: CallbackContext) -> None:
    try:
        order_id = int(update.message.text.split(maxsplit=1)[1])
    except ValueError:
        update.message.reply_text('Используйте: /delete номер_заказа')
        return
    
    if order_id in orders:
        del orders[order_id]
        update.message.reply_text(f'Заказ №{order_id} удален!')
        save_to_csv()
    else:
        update.message.reply_text(f'Заказ №{order_id} не найден')

def list_orders(update: Update, context: CallbackContext) -> None:
    if orders:
        orders_list = []
        for order_id, order_info in orders.items():
            orders_list.append(
                f"№{order_id}: {order_info['client']} - {order_info['service']} "
                f"({order_info['status']})"
            )
        update.message.reply_text('Список заказов:\n' + '\n'.join(orders_list))
    else:
        update.message.reply_text('Заказов нет')

def order_info(update: Update, context: CallbackContext) -> None:
    try:
        order_id = int(update.message.text.split(maxsplit=1)[1])
    except ValueError:
        update.message.reply_text('Используйте: /info номер_заказа')
        return
    
    if order_id in orders:
        order = orders[order_id]
        info_text = (
            f"Детальная информация о заказе №{order_id}:\n"
            f"Клиент: {order['client']}\n"
            f"Услуга: {order['service']}\n"
            f"Срок исполнения: {order['deadline']}\n"
            f"Бюджет: {order['budget']}\n"
            f"Статус: {order['status']}\n"
            f"Менеджер: {order['manager']}"
        )
        update.message.reply_text(info_text)
    else:
        update.message.reply_text(f'Заказ №{order_id} не найден')

def change_status(update: Update, context: CallbackContext) -> None:
    message_text = update.message.text.split(maxsplit=1)[1]
    
    try:
        order_id_str, new_status = message_text.split(',', 1)
        order_id = int(order_id_str)
    except ValueError:
        update.message.reply_text(
            'Используйте: /status номер_заказа, новый_статус\n'
            'Пример: /status 12345, В работе'
        )
        return
    
    if order_id in orders:
        orders[order_id]['status'] = new_status.strip()
        update.message.reply_text(f'Статус заказа №{order_id} изменен на "{new_status}"')
        save_to_csv()
    else:
        update.message.reply_text(f'Заказ №{order_id} не найден')

def assign_manager(update: Update, context: CallbackContext) -> None:
    message_text = update.message.text.split(maxsplit=1)[1]
    
    try:
        order_id_str, manager = message_text.split(',', 1)
        order_id = int(order_id_str)
    except ValueError:
        update.message.reply_text(
            'Используйте: /manager номер_заказа, ФИО_менеджера\n'
            'Пример: /manager 12345, Иванов И.И.'
        )
        return
    
    if order_id in orders:
        orders[order_id]['manager'] = manager.strip()
        update.message.reply_text(f'На заказ №{order_id} назначен менеджер: {manager}')
        save_to_csv()
    else:
        update.message.reply_text(f'Заказ №{order_id} не найден')

def dashboard(update: Update, context: CallbackContext) -> None:
    update.message.reply_text(f'Аналитический дашборд: {dashboard_url}')

def save_to_csv():
    with open(csv_file_path, mode='w', newline='', encoding='utf-8') as file:
        writer = csv.writer(file)
        writer.writerow(['OrderID', 'Client', 'Service', 'Deadline', 'Budget', 'Status', 'Manager'])
        for order_id, order_info in orders.items():
            writer.writerow([
                order_id,
                order_info['client'],
                order_info['service'],
                order_info['deadline'],
                order_info['budget'],
                order_info['status'],
                order_info['manager']
            ])

def load_from_csv():
    global orders
    try:
        with open(csv_file_path, mode='r', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            for row in reader:
                orders[int(row['OrderID'])] = {
                    'client': row['Client'],
                    'service': row['Service'],
                    'deadline': row['Deadline'],
                    'budget': float(row['Budget']),
                    'status': row['Status'],
                    'manager': row['Manager']
                }
    except FileNotFoundError:
        orders = {}

def main() -> None:
    load_from_csv()
    
    updater = Updater("8306340829:AAGwRxU6hFRbvhVV5tz9HNr92eXrT-W8zDI", use_context=True)
    dp = updater.dispatcher

    dp.add_handler(CommandHandler("start", start))
    dp.add_handler(CommandHandler("add", add_order))
    dp.add_handler(CommandHandler("update", update_order))
    dp.add_handler(CommandHandler("delete", delete_order))
    dp.add_handler(CommandHandler("list", list_orders))
    dp.add_handler(CommandHandler("info", order_info))
    dp.add_handler(CommandHandler("status", change_status))
    dp.add_handler(CommandHandler("manager", assign_manager))
    dp.add_handler(CommandHandler("dashboard", dashboard))

    updater.start_polling()
    print("Бот управления заказами запущен. Ожидание обновлений...")
    updater.idle()

if __name__ == '__main__':
    main()