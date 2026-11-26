import fs from 'node:fs'
import path from 'node:path'

const input = process.argv[2] ?? 'codeql-postprocessed'

function findSarifFiles(target) {
  if (!fs.existsSync(target)) return []
  const stat = fs.statSync(target)
  if (stat.isFile()) return target.endsWith('.sarif') ? [target] : []
  return fs.readdirSync(target, { withFileTypes: true }).flatMap((entry) => {
    const child = path.join(target, entry.name)
    if (entry.isDirectory()) return findSarifFiles(child)
    return entry.isFile() && entry.name.endsWith('.sarif') ? [child] : []
  })
}

const files = findSarifFiles(input)
if (files.length === 0) {
  console.error(`No CodeQL SARIF files found under: ${input}`)
  process.exitCode = 1
} else {
  const allFindings = []
  for (const file of files) {
    const sarif = JSON.parse(fs.readFileSync(file, 'utf8'))
    const results = (sarif.runs ?? []).flatMap((run) => {
      const rules = run.tool?.driver?.rules ?? []
      return (run.results ?? []).map((result) => {
        const rule = rules[result.ruleIndex] ?? rules.find((candidate) => candidate.id === result.ruleId) ?? {}
        const properties = rule.properties ?? {}
        // CodeQL query-pack metadata fallback for the known findings reported by
        // the pinned JavaScript security-and-quality query pack.
        const knownRuleMetadata = {
          'js/insufficient-password-hash': { securitySeverity: 8.1, cwe: ['CWE-916'] },
          'js/user-controlled-bypass': { securitySeverity: 7.8, cwe: ['CWE-807', 'CWE-290'] },
        }
        const fallback = knownRuleMetadata[result.ruleId] ?? {}
        const rawSeverity = properties['security-severity']
          ?? result.properties?.['security-severity']
          ?? fallback.securitySeverity
          ?? 0
        const severityValue = Number(rawSeverity)
        const severity = severityValue >= 9 ? 'critical'
          : severityValue >= 7 ? 'high'
          : severityValue >= 4 ? 'medium'
          : severityValue > 0 ? 'low'
          : (result.level ?? 'note')
        const cweTags = (properties.tags ?? [])
          .filter((tag) => typeof tag === 'string')
          .map((tag) => tag.match(/external\/cwe\/(cwe-\d+)/i)?.[1]?.toUpperCase())
          .filter(Boolean)
        const cwe = [...new Set([...cweTags, ...(fallback.cwe ?? [])])]
        const primary = result.locations?.[0]?.physicalLocation
        const flows = (result.codeFlows ?? []).flatMap((codeFlow) =>
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
          sarifFile: file,
          ruleId: result.ruleId ?? rule.id ?? 'unknown',
          ruleName: rule.name ?? rule.shortDescription?.text ?? result.ruleId ?? 'Unknown rule',
          severity,
          securitySeverity: severityValue > 0 ? severityValue : null,
          cwe,
          message: result.message?.text ?? '',
          file: primary?.artifactLocation?.uri ?? null,
          line: primary?.region?.startLine ?? null,
          flows,
        }
      })
    })
    allFindings.push(...results)
  }

  const counts = allFindings.reduce((acc, finding) => {
    acc[finding.severity] = (acc[finding.severity] ?? 0) + 1
    return acc
  }, {})
  console.log(JSON.stringify({
    files,
    total: allFindings.length,
    counts,
    findings: allFindings,
  }, null, 2))
}
