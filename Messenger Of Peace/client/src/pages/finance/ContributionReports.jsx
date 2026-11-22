import { useState, useEffect, useRef } from 'react'
import { Table, Badge, Row, Col, Form, Button, ButtonGroup } from 'react-bootstrap'
import { FiBarChart2, FiDownload, FiPrinter, FiFileText } from 'react-icons/fi'
import { toast } from 'react-toastify'
import api from '../../services/api'

const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export default function ContributionReports() {
  const now = new Date()
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const tableRef = useRef(null)

  useEffect(() => { fetchReport() }, [selectedMonth, selectedYear])

  const fetchReport = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/contributions/reports?month=${selectedMonth}&year=${selectedYear}`)
      setReport(res.data.data)
    } catch {
      setReport(null)
    } finally {
      setLoading(false)
    }
  }

  const exportCSV = () => {
    if (!report?.rows?.length) return toast.info('No data to export')
    const headers = ['Code,Name,Unit,Required,Paid,Balance,Status']
    const rows = report.rows.map(r => `${r.member_code},${r.member_name},${r.unit_name || 'N/A'},${r.required_amount},${r.total_paid},${r.balance},${r.status}`)
    const csv = [headers, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `MOP_Contributions_${monthNames[selectedMonth]}_${selectedYear}.csv`
    a.click(); URL.revokeObjectURL(url)
    toast.success('CSV downloaded')
  }

  const exportExcel = () => {
    if (!report?.rows?.length) return toast.info('No data to export')
    let xml = '<?xml version="1.0"?>\n<?mso-application progid="Excel.Sheet"?>\n<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"\n xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">\n<Styles><Style ss:ID="hdr"><Font ss:Bold="1" ss:Size="12"/></Style></Styles>\n<Worksheet ss:Name="Contributions"><Table>\n'
    xml += '<Row><Cell ss:StyleID="hdr"><Data ss:Type="String">Code</Data></Cell><Cell ss:StyleID="hdr"><Data ss:Type="String">Name</Data></Cell><Cell ss:StyleID="hdr"><Data ss:Type="String">Unit</Data></Cell><Cell ss:StyleID="hdr"><Data ss:Type="String">Required</Data></Cell><Cell ss:StyleID="hdr"><Data ss:Type="String">Paid</Data></Cell><Cell ss:StyleID="hdr"><Data ss:Type="String">Balance</Data></Cell><Cell ss:StyleID="hdr"><Data ss:Type="String">Status</Data></Cell></Row>\n'
    report.rows.forEach(r => {
      xml += `<Row><Cell><Data ss:Type="String">${r.member_code}</Data></Cell><Cell><Data ss:Type="String">${r.member_name}</Data></Cell><Cell><Data ss:Type="String">${r.unit_name || 'N/A'}</Data></Cell><Cell><Data ss:Type="Number">${r.required_amount}</Data></Cell><Cell><Data ss:Type="Number">${r.total_paid}</Data></Cell><Cell><Data ss:Type="Number">${r.balance}</Data></Cell><Cell><Data ss:Type="String">${r.status}</Data></Cell></Row>\n`
    })
    xml += '</Table></Worksheet></Workbook>'
    const blob = new Blob([xml], { type: 'application/vnd.ms-excel' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `MOP_Contributions_${monthNames[selectedMonth]}_${selectedYear}.xls`
    a.click(); URL.revokeObjectURL(url)
    toast.success('Excel downloaded')
  }

  const printReport = () => {
    const content = tableRef.current
    if (!content) return
    const win = window.open('', '', 'width=900,height=700')
    win.document.write(`<html><head><title>MOP Contribution Report</title><style>body{font-family:Arial;padding:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#6B21A8;color:white}tr:nth-child(even){background:#f2f2f2}.summary{margin-bottom:20px}.summary p{margin:4px 0}</style></head><body>`)
    win.document.write(`<h2>Messengers of Peace - Contribution Report</h2>`)
    win.document.write(`<div class="summary"><p><strong>Period:</strong> ${monthNames[selectedMonth]} ${selectedYear}</p><p><strong>Total Members:</strong> ${report.total} &nbsp;|&nbsp; <strong>Expected:</strong> RWF ${(report.expected || 0).toLocaleString()} &nbsp;|&nbsp; <strong>Collected:</strong> RWF ${(report.collected || 0).toLocaleString()}</p><p><strong>Paid:</strong> ${report.paid} &nbsp;|&nbsp; <strong>Partial:</strong> ${report.partial} &nbsp;|&nbsp; <strong>Unpaid:</strong> ${report.unpaid} &nbsp;|&nbsp; <strong>Rate:</strong> ${report.rate}%</p></div>`)
    win.document.write('<table><tr><th>Code</th><th>Member</th><th>Unit</th><th>Required</th><th>Paid</th><th>Balance</th><th>Status</th></tr>')
    (report.rows || []).forEach(r => {
      win.document.write(`<tr><td>${r.member_code}</td><td>${r.member_name}</td><td>${r.unit_name || 'N/A'}</td><td>${Number(r.required_amount).toLocaleString()}</td><td>${Number(r.total_paid).toLocaleString()}</td><td>${Number(r.balance).toLocaleString()}</td><td>${r.status}</td></tr>`)
    })
    win.document.write('</table></body></html>')
    win.document.close(); win.print()
  }

  const years = []; for (let y = 2025; y <= 2030; y++) years.push(y)

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="mb-0"><FiBarChart2 className="me-2" /> Contribution Reports</h4>
          <small className="text-muted">Generate monthly contribution reports</small>
        </div>
        <ButtonGroup>
          <Button variant="outline-primary" onClick={exportCSV}><FiDownload className="me-1" /> CSV</Button>
          <Button variant="outline-primary" onClick={exportExcel}><FiFileText className="me-1" /> Excel</Button>
          <Button variant="outline-primary" onClick={printReport}><FiPrinter className="me-1" /> Print</Button>
        </ButtonGroup>
      </div>

      <Row className="g-3 mb-4">
        <Col md={3}>
          <Form.Select value={selectedMonth} onChange={e => setSelectedMonth(parseInt(e.target.value))}>
            {monthNames.slice(1).map((n, i) => <option key={i + 1} value={i + 1}>{n}</option>)}
          </Form.Select>
        </Col>
        <Col md={2}>
          <Form.Select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </Form.Select>
        </Col>
      </Row>

      {report && (
        <>
          <Row className="g-3 mb-4">
            <Col md={2} sm={4} xs={6}>
              <div className="kpi-card h-100" style={{ borderLeftColor: '#6B21A8' }}>
                <div className="kpi-value" style={{ color: '#6B21A8' }}>{report.total}</div>
                <div className="kpi-label">Total Members</div>
              </div>
            </Col>
            <Col md={2} sm={4} xs={6}>
              <div className="kpi-card h-100" style={{ borderLeftColor: '#7C3AED' }}>
                <div className="kpi-value" style={{ color: '#7C3AED' }}>RWF {(report.expected || 0).toLocaleString()}</div>
                <div className="kpi-label">Expected</div>
              </div>
            </Col>
            <Col md={2} sm={4} xs={6}>
              <div className="kpi-card h-100" style={{ borderLeftColor: 'var(--mop-success)' }}>
                <div className="kpi-value" style={{ color: 'var(--mop-success)' }}>RWF {(report.collected || 0).toLocaleString()}</div>
                <div className="kpi-label">Collected</div>
              </div>
            </Col>
            <Col md={2} sm={4} xs={6}>
              <div className="kpi-card h-100" style={{ borderLeftColor: 'var(--mop-danger)' }}>
                <div className="kpi-value" style={{ color: 'var(--mop-danger)' }}>RWF {(report.outstanding || 0).toLocaleString()}</div>
                <div className="kpi-label">Outstanding</div>
              </div>
            </Col>
            <Col md={2} sm={4} xs={6}>
              <div className="kpi-card h-100" style={{ borderLeftColor: 'var(--mop-success)' }}>
                <div className="kpi-value" style={{ color: 'var(--mop-success)' }}>{report.paid}</div>
                <div className="kpi-label">Paid</div>
              </div>
            </Col>
            <Col md={2} sm={4} xs={6}>
              <div className="kpi-card h-100" style={{ borderLeftColor: 'var(--mop-warning)' }}>
                <div className="kpi-value" style={{ color: 'var(--mop-warning)' }}>{report.rate || 0}%</div>
                <div className="kpi-label">Collection Rate</div>
              </div>
            </Col>
          </Row>

          <div className="mop-card" ref={tableRef}>
            <div className="card-header py-3">
              <h6 className="mb-0 text-white">{monthNames[selectedMonth]} {selectedYear} - Contribution Details</h6>
            </div>
            <div className="table-responsive">
              <Table className="mop-table mb-0">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Code</th>
                    <th>Member</th>
                    <th>Unit</th>
                    <th>Required</th>
                    <th>Paid</th>
                    <th>Balance</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(report.rows || []).map((r, idx) => (
                    <tr key={r.id}>
                      <td>{idx + 1}</td>
                      <td><code>{r.member_code}</code></td>
                      <td className="fw-semibold">{r.member_name}</td>
                      <td><Badge bg="primary">{r.unit_name || 'N/A'}</Badge></td>
                      <td>{Number(r.required_amount).toLocaleString()} RWF</td>
                      <td className="fw-semibold" style={{ color: 'var(--mop-success)' }}>{Number(r.total_paid).toLocaleString()} RWF</td>
                      <td style={{ color: r.balance > 0 ? 'var(--mop-danger)' : '#6b7280' }}>{Number(r.balance).toLocaleString()} RWF</td>
                      <td>
                        <Badge bg={r.status === 'Paid' ? 'success' : r.status === 'Partial' ? 'warning' : 'danger'}>
                          {r.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  {(!report.rows || report.rows.length === 0) && (
                    <tr><td colSpan="8" className="text-center py-4 text-muted">No data for this period</td></tr>
                  )}
                </tbody>
              </Table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
