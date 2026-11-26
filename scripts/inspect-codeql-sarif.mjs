import fs from 'node:fs'

const input = process.argv[2] ?? 'results/javascript.sarif'
if (!fs.existsSync(input)) {
  console.error(`CodeQL SARIF file not found: ${input}`)
  process.exitCode = 1
} else {
  const sarif = JSON.parse(fs.readFileSync(input, 'utf8'))
  const results = (sarif.runs ?? []).flatMap((run) => {
    const rules = run.tool?.driver?.rules ?? []
    return (run.results ?? []).map((result) => {
      const rule = rules[result.ruleIndex] ?? {}
      const properties = rule.properties ?? {}
      const severityValue = Number(properties['security-severity'] ?? result.properties?.['security-severity'] ?? 0)
      const severity = severityValue >= 9 ? 'critical' : severityValue >= 7 ? 'high' : severityValue >= 4 ? 'medium' : severityValue > 0 ? 'low' : (result.level ?? 'note')
      const primary = result.locations?.[0]?.physicalLocation
      const flow = (result.codeFlows ?? []).flatMap((codeFlow) =>
        (codeFlow.threadFlows ?? []).flatMap((thread) =>
          (thread.locations ?? []).map((entry) => {
            const location = entry.location ?? {}
            const physical = location.physicalLocation ?? {}
            const region = physical.region ?? {}
            return {
              file: physical.artifactLocation?.uri ?? null,
              line: region.startLine ?? null,
              message: location.message?.text ?? null,
            }
          }),
        ),
      )
      return {
        ruleId: result.ruleId ?? rule.id ?? 'unknown',
        ruleName: rule.name ?? rule.shortDescription?.text ?? result.ruleId ?? 'Unknown rule',
        severity,
        securitySeverity: properties['security-severity'] ?? result.properties?.['security-severity'] ?? null,
        message: result.message?.text ?? '',
        file: primary?.artifactLocation?.uri ?? null,
        line: primary?.region?.startLine ?? null,
        flows: flow,
      }
    })
  })
  const counts = results.reduce((acc, finding) => {
    acc[finding.severity] = (acc[finding.severity] ?? 0) + 1
    return acc
  }, {})
  console.log(JSON.stringify({ input, total: results.length, counts, findings: results }, null, 2))
}
