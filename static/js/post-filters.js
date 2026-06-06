(function () {
  document.addEventListener('DOMContentLoaded', function () {
    const filtersRoot = document.getElementById('post-filters');
    const listing = document.getElementById('posts-file-listing');
    const status = document.getElementById('post-filter-status');

    if (!filtersRoot || !listing) return;

    const items = Array.from(listing.querySelectorAll('.post-file-item'));
    const groups = Array.from(filtersRoot.querySelectorAll('.post-filter-group'));
    const active = { technology: 'all', vulnerability: 'all' };

    function parseList(value) {
      return value ? value.split(',').map(function (v) { return v.trim(); }).filter(Boolean) : [];
    }

    function readQuery() {
      const params = new URLSearchParams(window.location.search);
      groups.forEach(function (group) {
        const key = group.dataset.filterGroup;
        const value = params.get(key);
        if (!value) return;
        active[key] = value;
        group.querySelectorAll('.post-filter-btn').forEach(function (btn) {
          btn.classList.toggle('is-active', btn.dataset.filter === value);
        });
      });
    }

    function writeQuery() {
      const params = new URLSearchParams(window.location.search);
      groups.forEach(function (group) {
        const key = group.dataset.filterGroup;
        if (active[key] === 'all') {
          params.delete(key);
        } else {
          params.set(key, active[key]);
        }
      });
      const query = params.toString();
      const next = window.location.pathname + (query ? '?' + query : '');
      window.history.replaceState({}, '', next);
    }

    function matches(item) {
      const techs = parseList(item.dataset.technologies);
      const vulns = parseList(item.dataset.vulnerabilities);

      if (active.technology !== 'all' && techs.indexOf(active.technology) === -1) return false;
      if (active.vulnerability !== 'all' && vulns.indexOf(active.vulnerability) === -1) return false;
      return true;
    }

    function applyFilters() {
      let visible = 0;
      items.forEach(function (item) {
        const show = matches(item);
        item.hidden = !show;
        if (show) visible++;
      });

      if (status) {
        if (visible === items.length) {
          status.textContent = 'showing ' + visible + ' post' + (visible === 1 ? '' : 's');
        } else {
          status.textContent = 'showing ' + visible + ' of ' + items.length + ' posts';
        }
      }

      writeQuery();
    }

    filtersRoot.addEventListener('click', function (e) {
      const btn = e.target.closest('.post-filter-btn');
      if (!btn) return;

      const group = btn.closest('.post-filter-group');
      if (!group) return;

      const key = group.dataset.filterGroup;
      active[key] = btn.dataset.filter;

      group.querySelectorAll('.post-filter-btn').forEach(function (option) {
        option.classList.toggle('is-active', option === btn);
      });

      applyFilters();
    });

    readQuery();
    applyFilters();
  });
})();
