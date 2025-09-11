// This file contains HTML, not JS. Rename to tournament.html and move to public or views folder for proper usage.
// If you want a pure JS file, provide only JS code.

<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Tournament · Trader Leveling</title>
    <link href="/css/minimal.css" rel="stylesheet" />
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons/font/bootstrap-icons.css" rel="stylesheet" />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
      body {
        margin: 0;
        padding: 0;
        min-height: 100vh;
        background: var(--bg-secondary);
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
      }
      .tournament-container {
        background: var(--bg-primary);
        border-radius: var(--radius-lg);
        box-shadow: var(--shadow-xl);
        width: 100%;
        max-width: 800px;
        overflow: hidden;
        animation: slideIn 0.5s ease;
      }

      .tournament-header {
        padding: 2rem 2rem 1rem;
        text-align: center;
        background: var(--bg-secondary);
      }

      .tournament-header h1 {
        margin: 0 0 0.5rem 0;
        color: var(--primary-color);
        font-size: 2rem;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
      }

      .tournament-header p {
        margin: 0.5rem 0 0 0;
        opacity: 0.9;
        font-size: 0.875rem;
      }

      .tournament-body {
        padding: 2rem;
      }

      .tournament-list {
        list-style: none;
        padding: 0;
        margin: 0;
        display: grid;
        grid-template-columns: 1fr;
        gap: 1.5rem;
      }

      .tournament-item {
        background: var(--bg-primary);
        border-radius: var(--radius-md);
        padding: 1.5rem;
        box-shadow: var(--shadow-md);
        transition: transform 0.2s ease;
      }

      .tournament-item:hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow-lg);
      }

      .tournament-item h2 {
        margin: 0 0 0.5rem 0;
        font-size: 1.25rem;
        color: var(--text-primary);
      }

      .tournament-item p {
        margin: 0.5rem 0 0 0;
        color: var(--text-secondary);
        font-size: 0.875rem;
      }

      .tournament-item .btn-join {
        margin-top: 1rem;
        padding: 0.75rem 1.5rem;
        background-color: var(--primary-color);
        color: var(--text-light);
        border: none;
        border-radius: var(--radius-md);
        font-weight: 500;
        font-size: 0.875rem;
        cursor: pointer;
        transition: all 0.2s ease;
        display: inline-block;
      }

      .tournament-item .btn-join:hover {
        background-color: var(--primary-hover);
        transform: translateY(-1px);
        box-shadow: var(--shadow-md);
      }

      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .nav-menu {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        padding: 1rem;
        background: var(--bg-primary);
        border-radius: var(--radius-lg);
        box-shadow: var(--shadow-md);
        margin: 1rem 0;
      }

      .nav-item {
        width: 100%;
      }

      .nav-link {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.75rem 1rem;
        border-radius: var(--radius-md);
        color: var(--text-primary);
        font-size: 0.875rem;
        transition: all 0.2s ease;
      }

      .nav-link:hover {
        background: var(--bg-secondary);
        color: var(--primary-color);
      }

      .bi {
        flex-shrink: 0;
        font-size: 1.25rem;
        color: var(--primary-color);
      }
    </style>
    <script src="/js/tournament.js"></script>
  </head>
  <body>
    <div class="tournament-container">
      <div class="tournament-header">
        <h1><i class="bi bi-trophy-fill"></i> Tournament</h1>
        <p>Join the ultimate trading competition</p>
      </div>
      <div class="tournament-body">
        <ul class="tournament-list">
          <!-- Tournament items will be populated here by JavaScript -->
        </ul>
      </div>
    </div>
    <script>
      // Fetch and display tournaments
      async function fetchTournaments() {
        try {
          const response = await fetch('/api/tournaments');
          const tournaments = await response.json();
          const tournamentList = document.querySelector('.tournament-list');
          tournamentList.innerHTML = '';
          tournaments.forEach(tournament => {
            const listItem = document.createElement('li');
            listItem.className = 'tournament-item';
            listItem.innerHTML = `
              <h2>${tournament.name}</h2>
              <p>${tournament.description}</p>
              <button class="btn-join" data-tournament-id="${tournament.id}">Join Tournament</button>
            `;
            tournamentList.appendChild(listItem);
          });
        } catch (error) {
          console.error('Error fetching tournaments:', error);
        }
      }

      // Join tournament event listener
      document.addEventListener('click', async (e) => {
        if (e.target.classList.contains('btn-join')) {
          const tournamentId = e.target.getAttribute('data-tournament-id');
          try {
            const response = await fetch('/api/tournament/join', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ tournamentId }),
            });
            if (response.ok) {
              const result = await response.json();
              alert(result.message);
              fetchTournaments(); // Refresh tournament list
            } else {
              const error = await response.text();
              alert('Error: ' + error);
            }
          } catch (error) {
            console.error('Error joining tournament:', error);
          }
        }
      });

      // Initial fetch
      fetchTournaments();
    </script>
  </body>
</html>