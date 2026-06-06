/**
 * GrowCircle - Premium State & Interaction Engine
 */

document.addEventListener('DOMContentLoaded', () => {
  console.log("GrowCircle Ecosystem Initialized.");
  
  let currentState = {
    screen: 'splash',
    tab: 'today',
    onboardingSlide: 0,
    completedGoals: 0
  };

  const $ = (id) => document.getElementById(id);
  const $$ = (sel) => document.querySelectorAll(sel);
  
  const switchScreen = (screenId) => {
    $$('.screen').forEach(s => s.classList.remove('active'));
    $(screenId).classList.add('active');
    currentState.screen = screenId;
  };

  const switchTab = (tabId) => {
    $$('.tab-view').forEach(t => t.classList.remove('active'));
    $$('.nav-tab').forEach(t => t.classList.remove('active'));
    
    $(`tab-${tabId}`).classList.add('active');
    $(`nav-${tabId}`).classList.add('active');
    currentState.tab = tabId;
  };

  // --- SPLASH & ONBOARDING ---
  setTimeout(() => { switchScreen('screen-onboarding'); }, 2500);

  const slides = $$('.onboarding-slide');
  const dots = $$('.dot');
  $('btn-onboarding-next').addEventListener('click', () => {
    if (currentState.onboardingSlide < slides.length - 1) {
      slides[currentState.onboardingSlide].classList.remove('active');
      dots[currentState.onboardingSlide].classList.remove('active');
      currentState.onboardingSlide++;
      slides[currentState.onboardingSlide].classList.add('active');
      dots[currentState.onboardingSlide].classList.add('active');
      
      if (currentState.onboardingSlide === slides.length - 1) {
        $('btn-onboarding-next').style.display = 'none';
      }
    }
  });

  // Oath Mechanics
  const btnOath = $('btn-oath-hold');
  let oathTimer; let oathProgress = 0;
  
  const startOath = () => {
    oathTimer = setInterval(() => {
      oathProgress += 2;
      btnOath.style.setProperty('--oath-fill', `${oathProgress}%`);
      if (oathProgress >= 100) completeOath();
    }, 20);
  };
  const stopOath = () => {
    clearInterval(oathTimer);
    if (oathProgress < 100) { oathProgress = 0; btnOath.style.setProperty('--oath-fill', '0%'); }
  };
  const completeOath = () => {
    clearInterval(oathTimer);
    if (window.confetti) confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    setTimeout(() => { switchScreen('screen-register'); }, 800);
  };

  if(btnOath) {
    btnOath.addEventListener('mousedown', startOath);
    btnOath.addEventListener('mouseup', stopOath);
    btnOath.addEventListener('mouseleave', stopOath);
    btnOath.addEventListener('touchstart', (e) => { e.preventDefault(); startOath(); });
    btnOath.addEventListener('touchend', stopOath);
  }

  // Start Solo For Now (Bypass)
  $('btn-start-solo').addEventListener('click', () => { switchScreen('screen-register'); });

  // --- REGISTRATION & SETUP ---
  $('btn-register-submit').addEventListener('click', () => { switchScreen('screen-setup'); });
  $('btn-setup-complete').addEventListener('click', () => { switchScreen('screen-app'); initApp(); });
  $('btn-create-circle').addEventListener('click', () => { switchScreen('screen-app'); initApp(); });

  // --- APP INITIALIZATION ---
  const initApp = () => {
    $$('.nav-tab').forEach(btn => {
      btn.addEventListener('click', (e) => { switchTab(e.currentTarget.dataset.tab); });
    });
    renderMyGoals();
    startCountdown();
    renderRadarChart();
    renderCalendar();
    initAtmosphere();
  };

  // --- GLOBAL ATMOSPHERE ---
  const initAtmosphere = () => {
    const pf = $('global-particles');
    for(let i=0; i<30; i++) {
      const p = document.createElement('div');
      p.className = 'particle';
      p.style.width = Math.random() * 4 + 2 + 'px';
      p.style.height = p.style.width;
      p.style.left = Math.random() * 100 + 'vw';
      p.style.animationDuration = Math.random() * 10 + 10 + 's';
      p.style.animationDelay = Math.random() * 10 + 's';
      pf.appendChild(p);
    }
  };

  // --- OMNIPRESENT ORBIT & MODALS ---
  $('orbit-trigger').addEventListener('click', () => {
    $('modal-orbit-expanded').classList.add('active');
    document.body.classList.add('modal-open');
  });
  $('btn-close-orbit').addEventListener('click', () => {
    $('modal-orbit-expanded').classList.remove('active');
    document.body.classList.remove('modal-open');
  });

  // Physics-based reactions
  $$('.btn-reaction').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const emoji = e.currentTarget.dataset.reaction;
      const rect = e.currentTarget.getBoundingClientRect();
      const fly = document.createElement('div');
      fly.className = 'physics-reaction';
      fly.textContent = emoji;
      fly.style.left = rect.left + rect.width/2 - 16 + 'px';
      fly.style.top = rect.top + 'px';
      document.body.appendChild(fly);

      // Trigger orbit bump animation
      setTimeout(() => {
        const orbitTarget = document.querySelector('.orbit-partner-avatar');
        const targetRect = orbitTarget.getBoundingClientRect();
        fly.style.transform = `translate(${targetRect.left - rect.left}px, ${targetRect.top - rect.top + 20}px) scale(0.5)`;
        fly.style.opacity = '0';
        
        setTimeout(() => {
          orbitTarget.classList.add('orbit-bump');
          if(window.navigator && window.navigator.vibrate) navigator.vibrate(50);
          setTimeout(() => { orbitTarget.classList.remove('orbit-bump'); fly.remove(); }, 300);
        }, 500);
      }, 50);
      
      // Close modal automatically after sending
      setTimeout(() => { $('btn-close-orbit').click(); }, 600);
    });
  });

  // --- COUNTDOWN ENGINE ---
  const startCountdown = () => {
    const timerEl = $('countdown-timer');
    const fillEl = $('countdown-fill');
    const endOfDay = new Date(); endOfDay.setHours(23, 59, 59, 999);

    const updateTimer = () => {
      const now = new Date();
      const diff = endOfDay - now;
      if (diff <= 0) return;
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const mins = Math.floor((diff / 1000 / 60) % 60);
      timerEl.textContent = `${hours.toString().padStart(2, '0')}h ${mins.toString().padStart(2, '0')}m`;
      const pct = (diff / (24 * 60 * 60 * 1000)) * 100;
      fillEl.style.transform = `scaleX(${pct / 100})`;
      requestAnimationFrame(updateTimer);
    };
    updateTimer();
  };

  // --- FLUID GOALS ENGINE ---
  const myGoals = [
    { id: 1, title: 'Wake up before 6 AM', icon: '🌅' },
    { id: 2, title: 'Drink 3L Water', icon: '💧' },
    { id: 3, title: 'Gym 45 min', icon: '🏋️‍♂️' },
  ];

  const renderMyGoals = () => {
    const list = $('active-goal-list');
    list.innerHTML = '';
    myGoals.forEach(g => {
      list.innerHTML += `
        <div class="goal-card-wrapper" id="wrap-goal-${g.id}">
          <div class="goal-card pending" id="goal-${g.id}">
             <div class="goal-icon">${g.icon}</div>
             <div class="goal-info"><h4>${g.title}</h4></div>
             <div class="goal-action-hint">Hold</div>
          </div>
        </div>
      `;
    });
    
    $$('.goal-card.pending').forEach(card => {
       let pressTimer; let isHolding = false;
       const startHold = () => {
         isHolding = true; card.style.transform = 'scale(0.95)';
         let pct = 0;
         pressTimer = setInterval(() => {
            pct += 4;
            card.style.background = `linear-gradient(to right, rgba(16, 185, 129, 0.4) ${pct}%, var(--c-bg-card) ${pct + 10}%)`;
            if(pct >= 100) completeGoal(card);
         }, 30);
       };
       const stopHold = () => {
         if(!isHolding) return;
         isHolding = false; clearInterval(pressTimer);
         card.style.transform = 'scale(1)';
         if(!card.classList.contains('completed')) card.style.background = 'var(--c-bg-card)';
       };
       card.addEventListener('mousedown', startHold);
       card.addEventListener('mouseup', stopHold);
       card.addEventListener('mouseleave', stopHold);
       card.addEventListener('touchstart', (e) => { e.preventDefault(); startHold(); });
       card.addEventListener('touchend', stopHold);
    });
  };

  const completeGoal = (card) => {
    card.classList.remove('pending');
    card.classList.add('completed');
    if(window.confetti) confetti({ particleCount: 50, spread: 40, origin: { y: 0.7 } });
    if(window.navigator && window.navigator.vibrate) navigator.vibrate(100);
    
    const xp = document.createElement('div');
    xp.className = 'xp-flyup'; xp.textContent = '+10 XP';
    xp.style.left = '50%'; xp.style.top = '50%';
    card.appendChild(xp);
    
    // Fluid Collapsing Logic
    setTimeout(() => {
      const wrapper = card.parentElement;
      wrapper.style.height = wrapper.offsetHeight + 'px'; // Fix height
      setTimeout(() => {
        wrapper.style.height = '0px';
        wrapper.style.opacity = '0';
        wrapper.style.margin = '0';
        
        setTimeout(() => {
          // Move to drawer
          const title = card.querySelector('h4').textContent;
          const icon = card.querySelector('.goal-icon').textContent;
          wrapper.remove();
          
          currentState.completedGoals++;
          $('completed-count').textContent = currentState.completedGoals;
          
          const mini = document.createElement('div');
          mini.className = 'goal-card-mini';
          mini.innerHTML = `<div class="goal-icon">${icon}</div><div class="goal-info"><h4>${title}</h4></div>`;
          $('completed-goal-list').appendChild(mini);
          
          // Mascot reaction
          $('today-mascot').classList.remove('state-neutral');
          $('today-mascot').classList.add('state-joyful');
          
        }, 400); // Wait for collapse
      }, 50);
    }, 1000); // Wait for XP flyup
  };

  // Completed Drawer Toggle
  $('drawer-toggle').addEventListener('click', () => {
    $('completed-goals-drawer').classList.toggle('open');
  });

  // --- MOCK SVG CHARTS ---
  const renderRadarChart = () => {
    const svg = $('radar-chart');
    if(!svg) return;
    const center = 100; const radius = 80; const sides = 5;
    const labels = ['Discipline', 'Consistency', 'Growth', 'Accountability', 'Social'];
    const scores = [0.8, 0.9, 0.6, 0.85, 0.7];
    
    for(let level=1; level<=4; level++) {
      let pts = [];
      for(let i=0; i<sides; i++) {
        const a = (Math.PI*2*i/sides) - (Math.PI/2);
        pts.push(`${center + (radius*level/4)*Math.cos(a)},${center + (radius*level/4)*Math.sin(a)}`);
      }
      svg.innerHTML += `<polygon points="${pts.join(' ')}" class="radar-grid"/>`;
    }
    
    for(let i=0; i<sides; i++) {
      const a = (Math.PI*2*i/sides) - (Math.PI/2);
      svg.innerHTML += `<line x1="${center}" y1="${center}" x2="${center + radius*Math.cos(a)}" y2="${center + radius*Math.sin(a)}" class="radar-axis"/>`;
      svg.innerHTML += `<text x="${center + (radius+15)*Math.cos(a)}" y="${center + (radius+15)*Math.sin(a)+4}" class="radar-label">${labels[i]}</text>`;
    }
    
    let dataPts = [];
    for(let i=0; i<sides; i++) {
      const a = (Math.PI*2*i/sides) - (Math.PI/2);
      dataPts.push(`${center + radius*scores[i]*Math.cos(a)},${center + radius*scores[i]*Math.sin(a)}`);
    }
    svg.innerHTML += `<polygon points="${dataPts.join(' ')}" class="radar-area"/>`;
  };

  const renderCalendar = () => {
    const grid = $('calendar-grid');
    if(!grid) return;
    ['M','T','W','T','F','S','S'].forEach(d => grid.innerHTML += `<div class="cal-day-label">${d}</div>`);
    for(let i=0; i<28; i++) {
      const level = Math.floor(Math.random() * 4);
      grid.innerHTML += `<div class="cal-cell level-${level} ${i===27?'today':''}"></div>`;
    }
  };

});
