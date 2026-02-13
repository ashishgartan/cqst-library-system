let currentPage = 1;

async function loadStats() {
  const res = await fetch("/api/books/stats");
  const data = await res.json();
  document.getElementById("totalBooks").textContent = data.total;
  document.getElementById("borrowedBooks").textContent = data.borrowed;
  document.getElementById("availableBooks").textContent = data.available;
}

async function loadBooks(page = 1) {
  const res = await fetch(`/api/books/paginated?page=${page}`);
  const data = await res.json();

  const list = document.getElementById("bookList");
  list.innerHTML = data.books
    .map(
      (b) => `
    <li class="py-2 flex justify-between">
      <span>${b.title} — ${b.author}</span>
      <span class="text-sm text-gray-500">Stock: ${b.stock}</span>
    </li>
  `
    )
    .join("");

  const pagination = document.getElementById("pagination");
  pagination.innerHTML = "";

  for (let i = 1; i <= data.totalPages; i++) {
    pagination.innerHTML += `
      <button onclick="changePage(${i})"
        class="px-3 py-1 rounded ${
          i === page ? "bg-black text-white" : "bg-gray-200"
        }">
        ${i}
      </button>`;
  }

  currentPage = page;
}

function changePage(page) {
  loadBooks(page);
}

loadStats();
loadBooks();
