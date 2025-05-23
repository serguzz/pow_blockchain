// main.js

// log function
function log(msg) {
  const el = document.getElementById("logs");
  const now = new Date();
  const time = now.toLocaleTimeString() + "." + now.getMilliseconds().toString().padStart(3, '0');

  // TODO: When received multiple lines in msg, split them into lines 
  // and add timestamp to first line only
 
  let finalText = `[${time}] ${msg}`;
  el.textContent += finalText + "\n";
  el.scrollTop = el.scrollHeight;
}


function mineBlock() {
    fetch('/mine', { method: 'POST' })
        .then(res => res.json())
        .then(data => log(data.message))
        .then(() => fetchChain())
        .catch(err => log("❌ Error mining: " + err));
}

function syncChain() {
    fetch('/sync', { method: 'POST' })
        .then(res => res.json())
        .then(data => log(data.message || "Synced."))
        .then(() => fetchChain())
        .catch(err => log("❌ Error syncing: " + err));
}

function fetchChain() {
    fetch('/chain')
        .then(res => res.json())
        .then(data => {
            renderChain(data);
        });
}

function renderChain(chainData) {
    const chainContainer = document.getElementById('chain');
    chainContainer.innerHTML = "";  // Clear old blocks

    chainData.forEach(block => {
        // wrap older block with one transaction
        const transactions = Array.isArray(block.transactions) ? block.transactions : [block.transactions];
        const transactionsHTML = '<pre>[' + transactions.map(tx => 
            `${tx}`
        ).join(',') + ']</pre>';
        const blockHTML = `
        <div class="block">
            <h2>Block #${block.index}</h2>
            <p><strong>Timestamp:</strong> ${block.timestamp}</p>
            <p><strong>Previous Hash:</strong> ${block.previous_hash}</p>
            <p><strong>Hash:</strong> ${block.hash}</p>
            <p><strong>Nonce:</strong> ${block.nonce}</p>
            <p><strong>Difficulty:</strong> ${block.difficulty}</p>
            <p><strong>Miner:</strong> ${block.miner}</p>
            <p><strong>Data:</strong></p>
            ${transactionsHTML}
        </div>`;
        chainContainer.innerHTML += blockHTML;
    });
    chainContainer.scrollTop = chainContainer.scrollHeight;
}

function fetchPendingTransactions() {
    fetch('/transactions')
        .then(res => res.json())
        .then(data => {
            renderPendingTransactions(data);
        });
}

function renderPendingTransactions(pendingTransactionsData) {
    const pendingList = document.getElementById('pendingTransactions');
    pendingList.innerHTML = '';

    if (pendingTransactionsData.length === 0) {
        pendingList.innerHTML = '<li>No pending transactions.</li>';
        return;
    }

    pendingTransactionsData.forEach(tx => {
        const txHTML = `
        <li>
            <pre>${JSON.stringify(tx, null, 2)}</pre>
        </li>`;
        pendingList.innerHTML += txHTML;
    });
}

function fetchPeers() {
    fetch('/peers')
        .then(res => res.json())
        .then(data => log("Known peers: " + JSON.stringify(data.peers)));
}

// Load saved theme or default to dark
function setDarkTheme() {
    const theme = localStorage.getItem('theme') || 'dark';
    localStorage.setItem('theme', theme);
    document.body.classList.add(theme + '-theme');
    document.getElementById('themeToggle').checked = theme === 'dark';
}

function startSSE() {
    const source = new EventSource('/stream');
    source.onmessage = (e) => {
        msg = e.data;
        log("📥 " + msg);
        if (msg.includes("accepted from") 
            || msg.includes("mined, saved and broadcasted")
            || msg.includes("Chain updated from peers")) {
            fetchChain();  // 🟢 re-fetch the chain from backend
            fetchPendingTransactions();  // 🟢 re-fetch the transactions from backend
        }
        if (msg.includes("removed from pending transactions")) {
            fetchPendingTransactions();  // 🟢 re-fetch the transactions from backend
        }
    }
    fetchPeers();  // 🟢 fetch peers on load
    fetchChain();  // 🟢 fetch the chain on load
    fetchPendingTransactions(); // 🟢 fetch perding transaction on load
    setDarkTheme();

  // Toggle and save
  document.getElementById('themeToggle').addEventListener('change', function () {
      const body = document.body;
      if (this.checked) {
          body.classList.remove('light-theme');
          body.classList.add('dark-theme');
          localStorage.setItem('theme', 'dark');
      } else {
          body.classList.remove('dark-theme');
          body.classList.add('light-theme');
          localStorage.setItem('theme', 'light');
      }
  });
  
  // Transaction file form. Transaction - JSON object with 'sender', 'receiver', and 'amount' info
  document.getElementById('transactionFileForm').addEventListener('submit', async function(event) {
    event.preventDefault();
    const fileInput = document.getElementById('transaction_file');
    const file = fileInput.files[0];
  
    const formData = new FormData();
    formData.append('transaction_file', file);
  
    await fetch('/submit_transaction_file', {
      method: 'POST',
      body: formData
    });

    // Clear the form fields
    // document.getElementById('transaction_file').value = ''; // Clear the file input
    // Fetch the transactions again to update the UI
    fetchPendingTransactions();
  });
  

  // setInterval(fetchTransactions, 3000);
  // fetchTransactions();

}

// Initialize the app
window.onload = startSSE;
