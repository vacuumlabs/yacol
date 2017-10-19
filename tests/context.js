import {context} from '../dist'
import {Promise} from 'bluebird'
import {assert} from 'chai'

describe('context', () => {

  it('basics', async () => {

    let here1 = false, here2 = false

    async function parent() {
      context.set('hello', 'world')
      await Promise.delay(10);

      (async function child1() {
        context.set('hello-child1', 'world-child1')
        await Promise.delay(10)
        // child can see parent's context
        assert.equal(context.get('hello'), 'world')
        // child can see it's own context
        assert.equal(context.get('hello-child1'), 'world-child1')
        // child cannot see sibling's context
        assert.equal(context.get('hello-child2'), undefined)
        // child can "override" value in parent's context though it cannot change it
        context.set('hello', 'world-child1-overriden')
        assert.equal(context.get('hello'), 'world-child1-overriden')
        here1 = true
      })();

      (async function child2() {
        await Promise.delay(50)
        context.set('hello-child2', 'world-child2')
        assert.equal(context.get('hello'), 'world')
        assert.equal(context.get('hello-child1'), undefined)
        assert.equal(context.get('hello-child2'), 'world-child2')
        here2 = true
      })()
    }

    await parent()
    assert.isOk(here1)
    assert.isOk(here2)

  })
})
