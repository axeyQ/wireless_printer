class PrintService {
    constructor() {
        this.printers = [];
        this.kotItems = []; // Array to hold KOT items with assigned printers

        // Initialize QZ Tray
        this.initQZ();
    }

    initQZ() {
        qz.api.setPromiseType(function (promise) {
            return new Promise(promise);
        });

        // Optionally, set up a certificate for secure communication
        qz.security.setCertificatePromise(function (resolve, reject) {
            // For testing purposes, resolve immediately
            resolve();
            // In production, you'd fetch or provide a certificate
        });

        qz.websocket.connect()
            .then(() => {
                console.log('Connected to QZ Tray');
                this.listPrinters();
            })
            .catch(err => console.error('QZ Tray connection error:', err));
    }

    listPrinters() {
        qz.printers.find()
            .then(printers => {
                this.printers = printers;
                this.populatePrinterSelects();
            })
            .catch(err => console.error('Error fetching printers:', err));
    }

    populatePrinterSelects() {
        const printerSelect = document.getElementById('printerSelect');
        const itemPrinterSelect = document.getElementById('itemPrinterSelect');

        // Clear existing options except the first placeholder
        printerSelect.innerHTML = '<option value="">--Select Printer--</option>';
        itemPrinterSelect.innerHTML = '<option value="">--Select Printer--</option>';

        this.printers.forEach(printer => {
            const option1 = document.createElement('option');
            option1.value = printer;
            option1.text = printer;
            printerSelect.add(option1);

            const option2 = document.createElement('option');
            option2.value = printer;
            option2.text = printer;
            itemPrinterSelect.add(option2);
        });
    }

    addKOTItem(itemName, quantity, printer) {
        this.kotItems.push({ name: itemName, qty: quantity, printer: printer });
        this.renderKOTItems();
    }

    removeKOTItem(index) {
        this.kotItems.splice(index, 1);
        this.renderKOTItems();
    }

    renderKOTItems() {
        const kotTableBody = document.getElementById('kotTableBody');
        kotTableBody.innerHTML = ''; // Clear existing items

        this.kotItems.forEach((item, index) => {
            const row = document.createElement('tr');

            const nameCell = document.createElement('td');
            nameCell.innerText = item.name;
            row.appendChild(nameCell);

            const qtyCell = document.createElement('td');
            qtyCell.innerText = item.qty;
            row.appendChild(qtyCell);

            const printerCell = document.createElement('td');
            printerCell.innerText = item.printer;
            row.appendChild(printerCell);

            const actionCell = document.createElement('td');
            const removeButton = document.createElement('button');
            removeButton.innerText = 'Remove';
            removeButton.onclick = () => this.removeKOTItem(index);
            actionCell.appendChild(removeButton);
            row.appendChild(actionCell);

            kotTableBody.appendChild(row);
        });
    }

    printReceipt() {
        const printer = document.getElementById('printerSelect').value;
        if (!printer) {
            alert('Please select a printer for the receipt.');
            return;
        }

        const data = [
            { type: 'raw', format: 'plain', data: '\n----- Receipt -----\n' },
            { type: 'raw', format: 'plain', data: 'Item 1\t$10.00\n' },
            { type: 'raw', format: 'plain', data: 'Item 2\t$15.00\n' },
            { type: 'raw', format: 'plain', data: '-------------------\n' },
            { type: 'raw', format: 'plain', data: 'Total\t$25.00\n' },
            { type: 'raw', format: 'plain', data: '-------------------\n\n' }
        ];

        const config = qz.configs.create(printer);
        qz.print(config, data)
            .then(() => console.log('Receipt printed successfully'))
            .catch(err => console.error('Print error:', err));
    }

    printKOT() {
        if (this.kotItems.length === 0) {
            alert('No items to print in KOT.');
            return;
        }

        // Group items by printer
        const printerGroups = this.kotItems.reduce((groups, item) => {
            const printer = item.printer || 'Unassigned';
            if (!groups[printer]) {
                groups[printer] = [];
            }
            groups[printer].push(item);
            return groups;
        }, {});

        // Iterate over each printer group and send print jobs
        const printPromises = Object.keys(printerGroups).map(printer => {
            if (printer === 'Unassigned') {
                alert('Some items are not assigned to any printer. Please assign a printer to all items.');
                return Promise.resolve();
            }

            const items = printerGroups[printer];
            let kotData = [
                { type: 'raw', format: 'plain', data: '\n----- Kitchen Order Ticket -----\n' },
                { type: 'raw', format: 'plain', data: 'Order Details:\n' }
            ];

            items.forEach(item => {
                kotData.push({
                    type: 'raw',
                    format: 'plain',
                    data: ` - ${item.name} x${item.qty}\n`
                });
            });

            kotData.push({ type: 'raw', format: 'plain', data: '-------------------------------\n\n' });

            const config = qz.configs.create(printer);
            return qz.print(config, kotData)
                .then(() => console.log(`KOT printed successfully on printer: ${printer}`))
                .catch(err => {
                    console.error(`Print error on printer ${printer}:`, err);
                    alert(`Failed to print KOT on printer: ${printer}. Check the console for more details.`);
                });
        });

        Promise.all(printPromises)
            .then(() => {
                // Clear items after all print jobs are attempted
                this.kotItems = [];
                this.renderKOTItems();
                alert('KOT printing initiated. Check console for status.');
            });
    }
}

// Initialize the print service and set up event listeners
document.addEventListener('DOMContentLoaded', () => {
    const printService = new PrintService();

    document.getElementById('printReceiptButton').addEventListener('click', () => {
        printService.printReceipt();
    });

    document.getElementById('printKOTButton').addEventListener('click', () => {
        printService.printKOT();
    });

    document.getElementById('addItemButton').addEventListener('click', () => {
        const itemNameInput = document.getElementById('itemName');
        const itemQtyInput = document.getElementById('itemQty');
        const itemPrinterSelect = document.getElementById('itemPrinterSelect');
        const itemName = itemNameInput.value.trim();
        const itemQty = parseInt(itemQtyInput.value, 10);
        const itemPrinter = itemPrinterSelect.value;

        if (itemName === '' || isNaN(itemQty) || itemQty <= 0 || itemPrinter === '') {
            alert('Please enter a valid item name, quantity, and assign a printer.');
            return;
        }

        printService.addKOTItem(itemName, itemQty, itemPrinter);
        itemNameInput.value = '';
        itemQtyInput.value = '';
        itemPrinterSelect.value = '';
    });
});