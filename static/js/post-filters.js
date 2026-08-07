(function () {
  document.addEventListener('DOMContentLoaded', function () {
    const filtersRoot = document.getElementById('post-filters');
    const listing = document.getElementById('posts-file-listing');
    const status = document.getElementById('post-filter-status');
    const clearBtn = document.getElementById('post-filter-clear');

    if (!filtersRoot || !listing) return;

    const items = Array.from(listing.querySelectorAll('.post-file-item'));
    const selects = Array.from(filtersRoot.querySelectorAll('.post-filter-select'));
    const active = {};

    selects.forEach(function (select) {
      active[select.dataset.filterGroup] = 'all';
    });

    function parseList(value) {
      return value
        ? value.split(',').map(function (v) { return v.trim(); }).filter(Boolean)
        : [];
    }

    function knownValues(select) {
      return Array.from(select.options).map(function (opt) { return opt.value; });
    }

    function isFiltered() {
      return selects.some(function (select) {
        return active[select.dataset.filterGroup] !== 'all';
      });
    }

    function readQuery() {
      const params = new URLSearchParams(window.location.search);
      selects.forEach(function (select) {
        const key = select.dataset.filterGroup;
        const value = params.get(key);
        if (!value || knownValues(select).indexOf(value) === -1) return;
        active[key] = value;
        select.value = value;
      });
    }

    function writeQuery() {
      const params = new URLSearchParams(window.location.search);
      selects.forEach(function (select) {
        const key = select.dataset.filterGroup;
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
      const year = item.dataset.year || '';

      if (active.technology && active.technology !== 'all' && techs.indexOf(active.technology) === -1) {
        return false;
      }
      if (active.vulnerability && active.vulnerability !== 'all' && vulns.indexOf(active.vulnerability) === -1) {
        return false;
      }
      if (active.year && active.year !== 'all' && year !== active.year) {
        return false;
      }
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

      if (clearBtn) {
        clearBtn.hidden = !isFiltered();
      }

      writeQuery();
    }

    function setSelectValue(select, value) {
      const key = select.dataset.filterGroup;
      const next = knownValues(select).indexOf(value) === -1 ? 'all' : value;
      active[key] = next;
      select.value = next;
    }

    selects.forEach(function (select) {
      select.addEventListener('change', function () {
        setSelectValue(select, select.value);
        applyFilters();
      });
    });

    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        selects.forEach(function (select) {
          setSelectValue(select, 'all');
        });
        applyFilters();
      });
    }

    readQuery();
    applyFilters();
  });
})();
