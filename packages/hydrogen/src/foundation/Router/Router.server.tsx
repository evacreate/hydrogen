import React, {ReactElement, Children, cloneElement} from 'react';
import {useServerRequest} from '../ServerRequestProvider';
import {FileRoutes} from './FileRoutes';
import {Route} from './Route.server';
import {ServerComponentRequest} from '../../framework/Hydration/ServerComponentRequest.server';
import {Boomerang} from '../Boomerang/Boomerang.client';
import {matchPath} from '../../utilities/matchPath';

type RouterProps = {
  children: Array<ReactElement> | ReactElement;
  serverProps: Record<string, any>;
  fallback: ReactElement;
};

export function Router({
  children,
  fallback,
  serverProps,
}: RouterProps): ReactElement | null {
  const request = useServerRequest();
  const currentPath = new URL(request.url).pathname;
  const result = recurseChildren(request, serverProps, currentPath, children);

  if (result) {
    return result;
  }

  return (
    <>
      {fallback}
      <Boomerang pageTemplate={'fallback'} />
    </>
  );
}

function recurseChildren(
  request: ServerComponentRequest,
  serverProps: Record<string, any>,
  currentPath: string,
  children: Array<ReactElement> | ReactElement
): ReactElement | null {
  for (const child of Children.toArray(children) as Array<ReactElement>) {
    if (child.type === FileRoutes) {
      const fileRoutingResult = child.type({...child.props, serverProps});
      if (fileRoutingResult)
        return (
          <>
            {fileRoutingResult}
            <Boomerang pageTemplate={fileRoutingResult.type.name} />
          </>
        );
      else continue;
    } else if (child.type === Route) {
      const match = matchPath(currentPath, {
        path: child.props.path,
        exact: true,
      });

      if (match) {
        request.ctx.routeParams = match.params;
        const name = child.props.page?.name ?? child.props.page?.type?.name;
        return (
          <>
            {cloneElement(child.props.page, {
              params: match.params || {},
              ...serverProps,
            })}
            {name ? <Boomerang pageTemplate={name} /> : null}
          </>
        );
      } else {
        continue;
      }
    } else if (child.props.children) {
      const result = recurseChildren(
        request,
        serverProps,
        currentPath,
        child.props.children
      );
      if (result) return result;
    }

    if (typeof child.type === 'function') {
      const result = recurseChildren(
        request,
        serverProps,
        currentPath,
        (child.type as any)(child.props) // is this a grevious hack?
      );
      if (result) return result;
    }
  }

  return null;
}
