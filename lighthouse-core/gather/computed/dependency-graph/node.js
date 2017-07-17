/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

class Node {

  /**
   * @param {string|number} id
   */
  constructor(id) {
    this._id = id;
    this._dependents = [];
    this._dependencies = [];
  }

  /**
   * @return {string|number}
   */
  get id() {
    return this._id;
  }

  /**
   * @return {!Array<!Node>}
   */
  getDependents() {
    return this._dependents.slice();
  }


  /**
   * @return {!Array<!Node>}
   */
  getDependencies() {
    return this._dependencies.slice();
  }


  /**
   * @return {!Node}
   */
  getRootNode() {
    let rootNode = this;
    while (rootNode._dependencies.length) {
      rootNode = rootNode._dependencies[0];
    }

    return rootNode;
  }

  /**
   * @param {!Node}
   */
  addDependent(node) {
    node.addDependency(this);
  }

  /**
   * @param {!Node}
   */
  addDependency(node) {
    if (this._dependencies.includes(node)) {
      return;
    }

    node._dependents.push(this);
    this._dependencies.push(node);
  }

  /**
   * Clones the node's information without adding any dependencies/dependents.
   * @return {!Node}
   */
  cloneWithoutRelationships() {
    return new Node(this.id);
  }

  /**
   * Clones the entire graph connected to this node filtered by the optional predicate. If a node is
   * included by the predicate, all nodes along the paths between the two will be included. If the
   * node that was called clone is not included in the resulting filtered graph, the return will be
   * undefined.
   * @param {function(!Node):boolean=} predicate
   * @return {?Node}
   */
  cloneWithRelationships(predicate) {
    const rootNode = this.getRootNode();

    let shouldIncludeNode = () => true;
    if (predicate) {
      const idsToInclude = new Set();
      rootNode.traverse(node => {
        if (predicate(node)) {
          node.traverse(
            node => idsToInclude.add(node.id),
            node => node._dependencies.filter(parent => !idsToInclude.has(parent))
          );
        }
      });

      shouldIncludeNode = node => idsToInclude.has(node.id);
    }

    const idToNodeMap = new Map();
    rootNode.traverse(originalNode => {
      if (!shouldIncludeNode(originalNode)) return;
      const clonedNode = originalNode.cloneWithoutRelationships();
      idToNodeMap.set(clonedNode.id, clonedNode);

      for (const dependency of originalNode._dependencies) {
        const clonedDependency = idToNodeMap.get(dependency.id);
        clonedNode.addDependency(clonedDependency);
      }
    });

    return idToNodeMap.get(this.id);
  }

  /**
   * Traverses all paths in the graph, calling iterator on each node visited. Decides which nodes to
   * visit with the getNext function.
   * @param {function(!Node,!Array<!Node>)} iterator
   * @param {function(!Node):!Array<!Node>} getNext
   */
  _traversePaths(iterator, getNext) {
    const stack = [[this]];
    while (stack.length) {
      const path = stack.shift();
      const node = path[0];
      iterator(node, path);

      const nodesToAdd = getNext(node);
      for (const nextNode of nodesToAdd) {
        stack.push([nextNode].concat(path));
      }
    }
  }

  /**
   * Traverses all connected nodes exactly once, calling iterator on each. Decides which nodes to
   * visit with the getNext function.
   * @param {function(!Node,!Array<!Node>)} iterator
   * @param {function(!Node):!Array<!Node>=} getNext Defaults to returning the dependents.
   */
  traverse(iterator, getNext) {
    if (!getNext) {
      getNext = node => node.getDependents();
    }

    const visited = new Set();
    const originalGetNext = getNext;

    getNext = node => {
      visited.add(node.id);
      const allNodesToVisit = originalGetNext(node);
      const nodesToVisit = allNodesToVisit.filter(nextNode => !visited.has(nextNode.id));
      nodesToVisit.forEach(nextNode => visited.add(nextNode.id));
      return nodesToVisit;
    };

    this._traversePaths(iterator, getNext);
  }
}

module.exports = Node;
