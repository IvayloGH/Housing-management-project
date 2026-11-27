import sys, pathlib
root = pathlib.Path(sys.argv[1])
jsx = root/'src/pages/ManagerPage.jsx'
s = jsx.read_text()
old = '''            <table className="table">
              <thead>'''
new = '''            {/* Fixed column widths, so the columns don't jump when "Show fixed reports" adds rows */}
            <table className="table table-fixed">
              <colgroup>
                <col style={{ width: '10%' }} />
                <col style={{ width: '28%' }} />
                <col style={{ width: '20%' }} />
                <col style={{ width: '15%' }} />
                <col style={{ width: '17%' }} />
                <col style={{ width: '10%' }} />
              </colgroup>
              <thead>'''
assert s.count(old) == 1; jsx.write_text(s.replace(old, new))
css = root/'src/index.css'
c = css.read_text()
old = '''.table .muted {
  color: var(--text-muted);
}
'''
new = old + '''
/* Same column widths whatever rows are shown (the manager's reports table) */
.table-fixed {
  table-layout: fixed;
  min-width: 720px;
}

.table-fixed td {
  overflow-wrap: anywhere;
}
'''
assert c.count(old) == 1; css.write_text(c.replace(old, new))
print('ok')
