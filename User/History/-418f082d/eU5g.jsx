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
    .join(SEPARATOR);
});

/**
 * @deprecated HOCs are deprecated
 */
const title = documentTitleOrGetter => ComposedComponent =>
  class extends Component {
    static displayName = "Title[" + (ComposedComponent.displayName || ComposedComponent.name) + "]";

    constructor(props) {
      super(props);
      // Set the initial title to GKavach when the component mounts
      document.title = "GKavach"; // Initial title
    }

    UNSAFE_componentWillMount() {
      componentStack.push(this);
      this._updateDocumentTitle();
    }

    componentDidUpdate() {
      this._updateDocumentTitle();
    }

    componentWillUnmount() {
      const index = componentStack.indexOf(this);
      if (index !== -1) {
        componentStack.splice(index, 1);
      }
      this._updateDocumentTitle();
    }

    _updateDocumentTitle() {
      if (typeof documentTitleOrGetter === "string") {
        this._documentTitle = documentTitleOrGetter;
      } else if (typeof documentTitleOrGetter === "function") {
        const result = documentTitleOrGetter(this.props);
        if (result == null) {
          this._documentTitle = "";
        } else if (typeof result === "string") {
          this._documentTitle = result;
        } else if (typeof result === "object") {
          this._documentTitle = 'GKavach'; // Set to GKavach while loading
          result.refresh?.then(() => this._updateDocumentTitle());

          if (result.titleIndex) {
            this._titleIndex = result.titleIndex;
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

export const SetTitle = props => {
  const Component = title(props.title)(() => null);
  return <Component />;
};

SetTitle.propTypes = {
  title: PropTypes.string,
};

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
