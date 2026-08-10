migrate(
  (app) => {
    // EXCLUSIVE RULE EXPRESSIONS — own variables, not reused from
    // any other migration (no SI, SO, HR, HC, G patterns)
    // ================================================================
    var SNAP_ACCESS_READ =
      "@request.auth.id != '' &amp;&amp; (@request.auth.perfil_id.slug = 'superadministrador' || @request.auth.perfil_id.slug = 'integracao')"
    var SNAP_ACCESS_CREATE =
      "@request.auth.id != '' &amp;&amp; @request.auth.perfil_id.slug = 'superadministrador'"

    // ================================================================
    // APPLY: Set rules on com_snapshots_negocio ONLY
    // ================================================================
    var snapCol = app.findCollectionByNameOrId('com_snapshots_negocio')
    snapCol.listRule = SNAP_ACCESS_READ
    snapCol.viewRule = SNAP_ACCESS_READ
    snapCol.createRule = SNAP_ACCESS_CREATE
    snapCol.updateRule = null
    snapCol.deleteRule = null
    app.save(snapCol)

    // ================================================================
    // POST-APPLY RE-READ: Re-read the five rules from persisted state
    // ================================================================
    var snapColAfter = app.findCollectionByNameOrId('com_snapshots_negocio')

    var afterListRule = snapColAfter.listRule
    var afterViewRule = snapColAfter.viewRule
    var afterCreateRule = snapColAfter.createRule
    var afterUpdateRule = snapColAfter.updateRule
    var afterDeleteRule = snapColAfter.deleteRule

    console.log('=== POST-APPLY RE-READ: com_snapshots_negocio ===')
    console.log('listRule:   ' + afterListRule)
    console.log('viewRule:   ' + afterViewRule)
    console.log('createRule: ' + afterCreateRule)
    console.log('updateRule: ' + afterUpdateRule)
    console.log('deleteRule: ' + afterDeleteRule)

    // ================================================================
    // VERIFICATION: Compare against target — FAIL and stop if mismatch
    // ================================================================
    var verificationPass = true

    if (afterListRule !== SNAP_ACCESS_READ) {
      console.log('FAIL: listRule does not match target')
      console.log('  expected: ' + SNAP_ACCESS_READ)
      console.log('  got:      ' + afterListRule)
      verificationPass = false
    }
    if (afterViewRule !== SNAP_ACCESS_READ) {
      console.log('FAIL: viewRule does not match target')
      console.log('  expected: ' + SNAP_ACCESS_READ)
      console.log('  got:      ' + afterViewRule)
      verificationPass = false
    }
    if (afterCreateRule !== SNAP_ACCESS_CREATE) {
      console.log('FAIL: createRule does not match target')
      console.log('  expected: ' + SNAP_ACCESS_CREATE)
      console.log('  got:      ' + afterCreateRule)
      verificationPass = false
    }
    if (afterUpdateRule !== null) {
      console.log('FAIL: updateRule does not match target')
      console.log('  expected: null')
      console.log('  got:      ' + afterUpdateRule)
      verificationPass = false
    }
    if (afterDeleteRule !== null) {
      console.log('FAIL: deleteRule does not match target')
      console.log('  expected: null')
      console.log('  got:      ' + afterDeleteRule)
      verificationPass = false
    }

    if (verificationPass) {
      console.log('=== VERIFICATION: PASS — all five rules match target ===')
    } else {
      console.log('=== VERIFICATION: FAIL — rules do not match target, stopping ===')
      throw new Error(
        'com_snapshots_negocio rule verification FAILED — persisted rules do not match target',
      )
    }
=======
    var snapCol = app.findCollectionByNameOrId('com_snapshots_negocio')
    snapCol.listRule = "@request.auth.id != '' &amp;&amp; (@request.auth.perfil_id.slug = 'superadministrador' || @request.auth.perfil_id.slug = 'integracao')"
    snapCol.viewRule = "@request.auth.id != '' &amp;&amp; (@request.auth.perfil_id.slug = 'superadministrador' || @request.auth.perfil_id.slug = 'integracao')"
    snapCol.createRule = "@request.auth.id != '' &amp;&amp; @request.auth.perfil_id.slug = 'superadministrador'"
    snapCol.updateRule = null
    snapCol.deleteRule = null
    app.save(snapCol)================================================================
    // PRE-WRITE READ: Record current persisted rules of
    // com_snapshots_negocio literally (preserving || and &&)
    // ================================================================
    var snapColBefore = app.findCollectionByNameOrId('com_snapshots_negocio')

    var beforeListRule = snapColBefore.listRule
    var beforeViewRule = snapColBefore.viewRule
    var beforeCreateRule = snapColBefore.createRule
    var beforeUpdateRule = snapColBefore.updateRule
    var beforeDeleteRule = snapColBefore.deleteRule

    console.log('=== PRE-WRITE READ: com_snapshots_negocio ===')
    console.log('listRule:   ' + beforeListRule)
    console.log('viewRule:   ' + beforeViewRule)
    console.log('createRule: ' + beforeCreateRule)
    console.log('updateRule: ' + beforeUpdateRule)
    console.log('deleteRule: ' + beforeDeleteRule)

    // ================================================================
    // EXCLUSIVE RULE EXPRESSIONS — own variables, not reused from
    // any other migration (no SI, SO, HR, HC, G patterns)
    // ================================================================
    var SNAP_ACCESS_READ =
      "@request.auth.id != '' && (@request.auth.perfil_id.slug = 'superadministrador' || @request.auth.perfil_id.slug = 'integracao')"
    var SNAP_ACCESS_CREATE =
      "@request.auth.id != '' && @request.auth.perfil_id.slug = 'superadministrador'"

    // ================================================================
    // APPLY: Set rules on com_snapshots_negocio ONLY
    // ================================================================
    var snapCol = app.findCollectionByNameOrId('com_snapshots_negocio')
    snapCol.listRule = SNAP_ACCESS_READ
    snapCol.viewRule = SNAP_ACCESS_READ
    snapCol.createRule = SNAP_ACCESS_CREATE
    snapCol.updateRule = null
    snapCol.deleteRule = null
    app.save(snapCol)

    // ================================================================
    // POST-APPLY RE-READ: Re-read the five rules from persisted state
    // ================================================================
    var snapColAfter = app.findCollectionByNameOrId('com_snapshots_negocio')

    var afterListRule = snapColAfter.listRule
    var afterViewRule = snapColAfter.viewRule
    var afterCreateRule = snapColAfter.createRule
    var afterUpdateRule = snapColAfter.updateRule
    var afterDeleteRule = snapColAfter.deleteRule

    console.log('=== POST-APPLY RE-READ: com_snapshots_negocio ===')
    console.log('listRule:   ' + afterListRule)
    console.log('viewRule:   ' + afterViewRule)
    console.log('createRule: ' + afterCreateRule)
    console.log('updateRule: ' + afterUpdateRule)
    console.log('deleteRule: ' + afterDeleteRule)

    // ================================================================
    // VERIFICATION: Compare against target — FAIL and stop if mismatch
    // ================================================================
    var verificationPass = true

    if (afterListRule !== SNAP_ACCESS_READ) {
      console.log('FAIL: listRule does not match target')
      console.log('  expected: ' + SNAP_ACCESS_READ)
      console.log('  got:      ' + afterListRule)
      verificationPass = false
    }
    if (afterViewRule !== SNAP_ACCESS_READ) {
      console.log('FAIL: viewRule does not match target')
      console.log('  expected: ' + SNAP_ACCESS_READ)
      console.log('  got:      ' + afterViewRule)
      verificationPass = false
    }
    if (afterCreateRule !== SNAP_ACCESS_CREATE) {
      console.log('FAIL: createRule does not match target')
      console.log('  expected: ' + SNAP_ACCESS_CREATE)
      console.log('  got:      ' + afterCreateRule)
      verificationPass = false
    }
    if (afterUpdateRule !== null) {
      console.log('FAIL: updateRule does not match target')
      console.log('  expected: null')
      console.log('  got:      ' + afterUpdateRule)
      verificationPass = false
    }
    if (afterDeleteRule !== null) {
      console.log('FAIL: deleteRule does not match target')
      console.log('  expected: null')
      console.log('  got:      ' + afterDeleteRule)
      verificationPass = false
    }

    if (verificationPass) {
      console.log('=== VERIFICATION: PASS — all five rules match target ===')
    } else {
      console.log('=== VERIFICATION: FAIL — rules do not match target, stopping ===')
      throw new Error(
        'com_snapshots_negocio rule verification FAILED — persisted rules do not match target',
      )
    }
  },
  (app) => {
    // ================================================================
    // ROLLBACK: Revert com_snapshots_negocio to the pre-migration state
    // (generic authenticated-only rules that were persisted before 0055)
    // ================================================================
    var SNAP_REVERT_READ = "@request.auth.id != ''"
    var SNAP_REVERT_CREATE = "@request.auth.id != ''"

    var snapCol = app.findCollectionByNameOrId('com_snapshots_negocio')
    snapCol.listRule = SNAP_REVERT_READ
    snapCol.viewRule = SNAP_REVERT_READ
    snapCol.createRule = SNAP_REVERT_CREATE
    snapCol.updateRule = null
    snapCol.deleteRule = null
    app.save(snapCol)
  },
)
