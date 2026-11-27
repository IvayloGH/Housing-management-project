import sys, pathlib
jsx = pathlib.Path(sys.argv[1])/'src/pages/ManagerPage.jsx'
s = jsx.read_text()
old = '''            <label className="check-label">
              <input type="checkbox" checked={showFixed} onChange={(e) => setShowFixed(e.target.checked)} />
              Show fixed reports
            </label>'''
new = '''            {/* Only when there are fixed reports to add */}
            {inHouse.length > openReports.length && (
              <button className="link-button" onClick={() => setShowFixed(!showFixed)}>
                {showFixed ? 'Show less' : 'View all reports (' + inHouse.length + ')'}
              </button>
            )}'''
assert s.count(old) == 1; s = s.replace(old, new)
old2 = '''so the columns don't jump when "Show fixed reports" adds rows'''
assert s.count(old2) == 1; s = s.replace(old2, '''so the columns don't jump when "View all reports" adds rows''')
jsx.write_text(s); print('ok')
