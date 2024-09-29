import PropTypes from "prop-types";
import { Component, cloneElement } from "react";
import { Route as _Route } from "react-router";
import _ from "underscore";

const componentStack = [];

const SEPARATOR = " · ";

const updateDocumentTitle = _.debounce(() => {
  document.title = componentStack
    .sort((a, b) => (a._titleIndex || 0) - (b._titleIndex || 0))
    .map(component => component._documentTitle)
    .filter(title => title)
    .reverse()
    .join(SEPARATOR)
    .replace('Metabase', 'GKavach');
});

/**
 * @deprecated HOCs are deprecated
 */
const title = documentTitleOrGetter => ComposedComponent =>
  class extends Component {
    static displayName =
      "Title[" +
      (ComposedComponent.displayName || ComposedComponent.name) +
      "]".replace('Metabase', 'GKavach');

    UNSAFE_componentWillMount() {
      componentStack.push(this);
      this._updateDocumentTitle();
    }
    componentDidUpdate() {
      this._updateDocumentTitle();
    }
    componentWillUnmount() {
      for (let i = 0; i < componentStack.length; i++) {
        if (componentStack[i] === this) {
          componentStack.splice(i, 1);
          break;
        }
      }
      this._updateDocumentTitle();
    }

    _updateDocumentTitle() {
      if (typeof documentTitleOrGetter === "string") {
        this._documentTitle = documentTitleOrGetter.replace('Metabase', 'GKavach');
      } else if (typeof documentTitleOrGetter === "function") {
        const result = documentTitleOrGetter(this.props);
        if (result == null) {
          // title functions might return null before data is loaded
          this._documentTitle = "";
        } else if (result instanceof String || typeof result === "string") {
          this._documentTitle = result.replace('Metabase', 'GKavach');
        } else if (typeof result === "object") {
          // The getter can return an object with a `refresh` promise along with
          // the title. When that promise resolves, we call
          // `documentTitleOrGetter` again.
          this._documentTitle = 'GKavach';
          result.refresh?.then(() => this._updateDocumentTitle());

          // Getter can also return a priority index used for sorting the component stack
          if (result.titleIndex) {
            this._titleIndex = result.titleIndex.replace('Metabase', 'GKavach');
          }
        }
      }
      updateDocumentTitle();
    }

    render() {
      return <ComposedComponent {...this.props} />;
    }
  };

export default title;

/**
 * Component version of the title HOC
 * @param {string} props.title
 */
export const SetTitle = props => {
  const Component = title(props.title)(() => null);
  return <Component />;
};

SetTitle.propTypes = {
  title: PropTypes.string,
};

// react-router Route wrapper that adds a `title` property
export class Route extends _Route {
  static createRouteFromReactElement(element) {
    if (element.props.title) {
      element = cloneElement(element, {
        component: title(element.props.title)(
          element.props.component || (({ children }) => children),
        ),
      });
    }
    return _Route.createRouteFromReactElement(element);
  }
}
